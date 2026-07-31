import type { SuiEvent } from '@mysten/sui/jsonRpc'
import { createLogger } from '../logger'
import { isRecord } from '../utils'

// Bound the dedupe set so long-lived subscriptions don't grow it unbounded.
const EVENT_STREAM_MAX_SEEN_EVENTS = 5_000

const log = createLogger()

/**
 * The GraphQL subscription document that feeds optimistic updates.
 *
 * Matches Sui's `Subscription.events(filter: EventFilter): EventEdge!` — each
 * emission is a single edge. The decoded Move fields live under
 * `node.contents.json`, the fully-qualified event type under
 * `node.contents.type.repr`, and the event identity is the transaction digest
 * plus `sequenceNumber`.
 *
 * `EventFilter.type` is a single string (prefix match on package /
 * package::module / full type), so we open one subscription per package (see
 * {@link deriveEventFilters}) and still narrow to exact types client-side.
 */
export const ASSEMBLY_EVENTS_SUBSCRIPTION = `
  subscription AssemblyEvents($filter: EventFilter) {
    events(filter: $filter) {
      cursor
      node {
        sequenceNumber
        transaction {
          digest
        }
        contents {
          type {
            repr
          }
          json
        }
      }
    }
  }
`

// Re-exported so the provider and event handlers keep consuming the exact same
// shape they did with the gRPC checkpoint stream.
export type EventUnsubscribe = () => Promise<void>
export type StreamEvent = Pick<SuiEvent, 'id' | 'type' | 'parsedJson'>
export type StreamEventBatchHandler = (events: StreamEvent[]) => void
/**
 * Called when a subscription reconnects after an interruption, so the consumer
 * can fire a confirming refetch and backfill anything missed while
 * disconnected. This is the GraphQL analogue of the gRPC checkpoint-gap signal.
 */
export type StreamGapHandler = () => void

/** Minimal sink shape (a subset of the `graphql-sse` Sink). */
export type EventStreamSink = {
  next: (value: unknown) => void
  error: (error: unknown) => void
  complete: () => void
}

/**
 * Transport abstraction so the stream is testable without a real SSE
 * connection. Production wiring (see eventRefresh.ts) adapts a `graphql-sse`
 * client to this.
 */
export type EventStreamClient = {
  /**
   * Open a subscription; returns a disposer that ends it. `onConnected` fires
   * on every (re)connect with `reconnected` indicating whether it followed a
   * broken connection.
   */
  subscribe: (
    payload: { query: string; variables: Record<string, unknown> },
    sink: EventStreamSink,
    onConnected?: (reconnected: boolean) => void,
  ) => () => void
}

/**
 * Distinct server-side filters to subscribe with, one per package referenced by
 * `eventTypes`. `EventFilter.type` prefix-matches, so a bare package id catches
 * every module (inventory/fuel/status) under it in a single subscription.
 * Exported for unit testing.
 */
export function deriveEventFilters(
  eventTypes: readonly string[],
): { type: string }[] {
  const packages = new Set<string>()
  for (const eventType of eventTypes) {
    const packageId = eventType.split('::')[0]
    if (packageId) packages.add(packageId)
  }
  return [...packages].map((type) => ({ type }))
}

function parseSequenceNumber(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  return '0'
}

function edgeToStreamEvent(edge: unknown): StreamEvent | null {
  if (!isRecord(edge)) return null
  const node = isRecord(edge['node']) ? edge['node'] : edge
  const contents = isRecord(node['contents']) ? node['contents'] : undefined
  const parsedJson = contents?.['json']
  const type = isRecord(contents?.['type'])
    ? contents['type']['repr']
    : undefined
  if (typeof type !== 'string' || !isRecord(parsedJson)) return null

  const transaction = isRecord(node['transaction'])
    ? node['transaction']
    : undefined
  const digest = transaction?.['digest']
  const cursor = edge['cursor']
  // Prefer the tx digest for the dedupe id; fall back to the edge cursor.
  const txDigest =
    typeof digest === 'string'
      ? digest
      : typeof cursor === 'string'
        ? cursor
        : ''

  return {
    id: { txDigest, eventSeq: parseSequenceNumber(node['sequenceNumber']) },
    type,
    parsedJson,
  }
}

function toEdgeArray(data: unknown): unknown[] {
  // graphql-sse delivers `{ data: { events: <EventEdge> } }`, one edge per
  // message. Tolerate a pre-unwrapped payload or a list of edges.
  const root = isRecord(data) && 'data' in data ? data['data'] : data
  if (!isRecord(root)) return []
  const events = root['events']
  if (Array.isArray(events)) return events
  if (events !== undefined && events !== null) return [events]
  return []
}

/**
 * Map a raw subscription emission to the `StreamEvent` batch the consumer
 * expects. Exported for unit testing. Events without a decodable type or
 * `parsedJson`, or whose type is not in `eventTypes`, are dropped (the server
 * filters by package, so this narrows to the exact tracked types).
 */
export function extractEventsFromSubscription(
  data: unknown,
  eventTypes: readonly string[],
): StreamEvent[] {
  return toEdgeArray(data).flatMap((edge) => {
    const event = edgeToStreamEvent(edge)
    if (!event) return []
    if (!eventTypes.includes(event.type)) return []
    return [event]
  })
}

function collectUnseenEvents(
  events: StreamEvent[],
  seenEventIds: Set<string>,
): StreamEvent[] {
  return events.filter((event) => {
    const eventId = `${event.id.txDigest}:${event.id.eventSeq}`
    if (seenEventIds.has(eventId)) return false
    seenEventIds.add(eventId)
    // Evict oldest ids (insertion order) once the set exceeds its cap.
    while (seenEventIds.size > EVENT_STREAM_MAX_SEEN_EVENTS) {
      const oldest = seenEventIds.values().next().value
      if (oldest === undefined) break
      seenEventIds.delete(oldest)
    }
    return true
  })
}

/**
 * Subscribe to assembly Move events over the GraphQL SSE subscription and
 * deliver them in batches to `onEvents`. Mirrors the contract the gRPC
 * checkpoint stream provided: deduped `{ id, type, parsedJson }` events, plus
 * an `onGap` signal on reconnect so the consumer can fire a confirming refetch.
 *
 * Opens one subscription per package (Sui's `EventFilter.type` takes a single
 * value); all subscriptions share one dedupe set and one `onEvents` sink.
 */
export function createGraphqlEventStream({
  client,
  eventTypes,
  onError,
  onEvents,
  onGap,
  signal,
}: {
  client: EventStreamClient
  eventTypes: readonly string[]
  onError?: (error: unknown) => void
  onEvents?: StreamEventBatchHandler
  onGap?: StreamGapHandler
  signal?: AbortSignal
}): EventUnsubscribe {
  const seenEventIds = new Set<string>()
  let stopped = false
  const disposers: Array<() => void> = []

  const sink: EventStreamSink = {
    next: (value) => {
      if (stopped) return
      const parsed = extractEventsFromSubscription(value, eventTypes)
      const events = collectUnseenEvents(parsed, seenEventIds)
      // Gated by VITE_LOG_LEVEL / Vite MODE (dev defaults to `debug`).
      // `raw` is the untouched subscription payload, `parsed` is after
      // type-mapping/filtering, `delivered` is after dedupe.
      log.debug('[DappKit] GraphQL subscription message', {
        raw: value,
        parsed,
        delivered: events,
      })
      if (events.length > 0) onEvents?.(events)
    },
    error: (error) => {
      if (stopped || signal?.aborted) return
      onError?.(error)
    },
    complete: () => {
      log.debug('[DappKit] GraphQL event subscription completed')
    },
  }

  const onConnected = (reconnected: boolean) => {
    // Only reconnects can have missed events; the initial connect needs no
    // backfill because the provider already did its initial fetch.
    if (!stopped && reconnected) onGap?.()
  }

  if (!stopped && !signal?.aborted) {
    for (const filter of deriveEventFilters(eventTypes)) {
      const dispose = client.subscribe(
        { query: ASSEMBLY_EVENTS_SUBSCRIPTION, variables: { filter } },
        sink,
        onConnected,
      )
      disposers.push(dispose)
    }
  }

  const stop: EventUnsubscribe = async () => {
    stopped = true
    for (const dispose of disposers) dispose()
    disposers.length = 0
  }

  signal?.addEventListener('abort', () => {
    void stop()
  })

  return stop
}
