import type { SuiEvent } from '@mysten/sui/jsonRpc'
import { createLogger } from '../logger'
import { isRecord } from '../utils'
import { decodeEventBcsToJson } from './eventBcsRegistry'

const CHECKPOINT_STREAM_RECONNECT_MS = 1_000
// Rotate before the public fullnode ~30s stream cutoff.
const CHECKPOINT_STREAM_MAX_SESSION_MS = 28_000
// Backup if a session stops yielding without closing cleanly.
const CHECKPOINT_STREAM_IDLE_MS = 35_000
// Bound the dedupe set so long-lived sessions don't grow it unbounded.
const CHECKPOINT_STREAM_MAX_SEEN_EVENTS = 5_000
const CHECKPOINT_STREAM_READ_MASK_PATHS = [
  'transactions.digest',
  'transactions.events',
  'sequence_number',
] as const

type ProtobufValue = {
  kind?: {
    oneofKind?: string
    nullValue?: unknown
    numberValue?: number
    stringValue?: string
    boolValue?: boolean
    structValue?: ProtobufStruct
    listValue?: { values?: ProtobufValue[] }
  }
}

type ProtobufStruct = {
  fields?: Record<string, ProtobufValue>
}

type StreamState = {
  isInitialSession: boolean
  lastCheckpointSequence: number | null
  seenEventIds: Set<string>
}

export type CheckpointStreamTransaction = {
  digest?: string
  events?: {
    events?: Array<{
      eventType?: string
      event_type?: string
      json?: ProtobufValue
      contents?: {
        value?: Uint8Array
      }
    }>
  }
}

export type CheckpointStreamMessage = {
  checkpoint?: {
    sequenceNumber?: number | bigint
    sequence_number?: number | bigint
    transactions?: CheckpointStreamTransaction[]
  }
}

export type EventUnsubscribe = () => Promise<void>
export type InventoryEvent = Pick<SuiEvent, 'id' | 'type' | 'parsedJson'>
export type InventoryEventBatchHandler = (events: InventoryEvent[]) => void
export type CheckpointGapHandler = (
  lastCheckpoint: number,
  nextCheckpoint: number,
) => void
export type CheckpointStreamSession = {
  cancel: () => void
  responses: AsyncIterable<CheckpointStreamMessage>
}
export type SubscribeCheckpoints = (request: {
  readMask: { paths: readonly string[] }
}) => CheckpointStreamSession

const log = createLogger()

function protobufValueToJson(value: ProtobufValue | undefined): unknown {
  const kind = value?.kind
  if (!kind?.oneofKind) return null
  if (kind.oneofKind === 'nullValue') return null
  if (kind.oneofKind === 'structValue')
    return protobufStructToJson(kind.structValue)
  if (kind.oneofKind === 'listValue') {
    return (kind.listValue?.values ?? []).map(protobufValueToJson)
  }
  // Scalar kinds: numberValue, stringValue, boolValue
  return (kind as Record<string, unknown>)[kind.oneofKind] ?? null
}

function protobufStructToJson(
  struct: ProtobufStruct | undefined,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(struct?.fields ?? {}).map(([key, value]) => [
      key,
      protobufValueToJson(value),
    ]),
  )
}

function parseEventPayloadFromStream(
  event: { json?: ProtobufValue; contents?: { value?: Uint8Array } },
  eventType: string,
): Record<string, unknown> | null {
  const fromProtobuf = protobufValueToJson(event.json)
  if (isRecord(fromProtobuf)) return fromProtobuf

  const bcsBytes = event.contents?.value
  if (!bcsBytes) return null

  return decodeEventBcsToJson(bcsBytes, eventType)
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timeoutId)
      reject(signal?.reason)
    }

    if (signal?.aborted) {
      clearTimeout(timeoutId)
      reject(signal.reason)
      return
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function getStreamEventType(event: {
  eventType?: string
  event_type?: string
}) {
  return event.eventType ?? event.event_type ?? ''
}

function getCheckpointSequenceNumber(
  checkpoint: CheckpointStreamMessage['checkpoint'],
): number | null {
  const seq = checkpoint?.sequenceNumber ?? checkpoint?.sequence_number
  if (typeof seq === 'bigint') return Number(seq)
  return typeof seq === 'number' && Number.isFinite(seq) ? seq : null
}

function getReadTimeoutMs(
  maxSessionMs: number,
  idleMs: number,
  elapsedMs: number,
): number | null {
  if (maxSessionMs <= 0 && idleMs <= 0) return null
  const msUntilRotation =
    maxSessionMs > 0 ? maxSessionMs - elapsedMs : Number.POSITIVE_INFINITY
  return Math.min(
    idleMs > 0 ? idleMs : Number.POSITIVE_INFINITY,
    msUntilRotation,
  )
}

async function readNextCheckpointMessage(
  iterator: AsyncIterator<CheckpointStreamMessage>,
  session: CheckpointStreamSession,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<IteratorResult<CheckpointStreamMessage>> {
  if (timeoutMs <= 0 || !Number.isFinite(timeoutMs)) {
    return iterator.next()
  }

  const timeout = wait(timeoutMs, signal).then(() => {
    session.cancel()
    throw new Error('checkpoint stream idle timeout')
  })

  return Promise.race([iterator.next(), timeout])
}

function getInventoryEventId(
  event: InventoryEvent,
  checkpointSequence?: number | null,
) {
  if (event.id.txDigest) {
    return `${event.id.txDigest}:${event.id.eventSeq}`
  }
  return `checkpoint-${checkpointSequence ?? 'unknown'}:${event.id.eventSeq}:${event.type}`
}

function collectUnseenInventoryEvents(
  events: InventoryEvent[],
  seenEventIds: Set<string>,
  checkpointSequence?: number | null,
) {
  return events.filter((event) => {
    const eventId = getInventoryEventId(event, checkpointSequence)
    if (seenEventIds.has(eventId)) return false
    seenEventIds.add(eventId)
    // Evict oldest ids (insertion order) once the set exceeds its cap.
    while (seenEventIds.size > CHECKPOINT_STREAM_MAX_SEEN_EVENTS) {
      const oldest = seenEventIds.values().next().value
      if (oldest === undefined) break
      seenEventIds.delete(oldest)
    }
    return true
  })
}

function processCheckpointMessage(
  message: CheckpointStreamMessage,
  state: StreamState,
  eventTypes: readonly string[],
  onEvents: InventoryEventBatchHandler | undefined,
  onGap: CheckpointGapHandler | undefined,
): void {
  const sequenceNumber = getCheckpointSequenceNumber(message.checkpoint)

  if (state.isInitialSession) {
    state.isInitialSession = false
    if (sequenceNumber != null) state.lastCheckpointSequence = sequenceNumber
    return
  }

  if (
    state.lastCheckpointSequence != null &&
    sequenceNumber != null &&
    sequenceNumber > state.lastCheckpointSequence + 1
  ) {
    onGap?.(state.lastCheckpointSequence, sequenceNumber)
  }

  const events = collectUnseenInventoryEvents(
    extractInventoryEventsFromCheckpoint(message.checkpoint, eventTypes),
    state.seenEventIds,
    sequenceNumber,
  )
  if (events.length > 0) onEvents?.(events)
  if (sequenceNumber != null) state.lastCheckpointSequence = sequenceNumber
}

async function runSession(
  session: CheckpointStreamSession,
  state: StreamState,
  config: {
    eventTypes: readonly string[]
    idleMs: number
    maxSessionMs: number
    isStopped: () => boolean
    onError: ((error: unknown) => void) | undefined
    onEvents: InventoryEventBatchHandler | undefined
    onGap: CheckpointGapHandler | undefined
    signal: AbortSignal | undefined
  },
): Promise<void> {
  const {
    eventTypes,
    idleMs,
    maxSessionMs,
    isStopped,
    onError,
    onEvents,
    onGap,
    signal,
  } = config
  const iterator = session.responses[Symbol.asyncIterator]()
  const sessionStartedAt = Date.now()

  while (!isStopped() && !signal?.aborted) {
    const timeoutMs = getReadTimeoutMs(
      maxSessionMs,
      idleMs,
      Date.now() - sessionStartedAt,
    )
    if (timeoutMs != null && timeoutMs <= 0) return

    let result: IteratorResult<CheckpointStreamMessage>
    try {
      result = await readNextCheckpointMessage(
        iterator,
        session,
        timeoutMs ?? 0,
        signal,
      )
    } catch (error) {
      if (isStopped() || signal?.aborted) return
      if (maxSessionMs > 0 && Date.now() - sessionStartedAt >= maxSessionMs)
        return
      onError?.(error)
      return
    }

    if (result.done || !result.value) return

    processCheckpointMessage(result.value, state, eventTypes, onEvents, onGap)
  }
}

export function extractInventoryEventsFromCheckpoint(
  checkpoint: CheckpointStreamMessage['checkpoint'],
  eventTypes: readonly string[],
): InventoryEvent[] {
  const checkpointSequence = getCheckpointSequenceNumber(checkpoint)

  return (checkpoint?.transactions ?? []).flatMap((transaction, txIndex) => {
    const txDigest =
      transaction.digest ??
      (checkpointSequence != null
        ? `checkpoint-${checkpointSequence}-${txIndex}`
        : `checkpoint-tx-${txIndex}`)

    return (transaction.events?.events ?? []).flatMap((event, eventSeq) => {
      const type = getStreamEventType(event)
      if (!eventTypes.includes(type)) return []

      const parsedJson = parseEventPayloadFromStream(event, type)
      if (!parsedJson) return []

      return [
        { id: { txDigest, eventSeq: String(eventSeq) }, type, parsedJson },
      ]
    })
  })
}

export function createInventoryCheckpointStream({
  eventTypes,
  idleMs = CHECKPOINT_STREAM_IDLE_MS,
  maxSessionMs = CHECKPOINT_STREAM_MAX_SESSION_MS,
  onError,
  onEvents,
  onGap,
  reconnectMs = CHECKPOINT_STREAM_RECONNECT_MS,
  signal,
  subscribeCheckpoints,
}: {
  eventTypes: readonly string[]
  idleMs?: number
  maxSessionMs?: number
  onError?: (error: unknown) => void
  onEvents?: InventoryEventBatchHandler
  onGap?: CheckpointGapHandler
  reconnectMs?: number
  signal?: AbortSignal
  subscribeCheckpoints: SubscribeCheckpoints
}): EventUnsubscribe {
  let stopped = false
  let activeSession: CheckpointStreamSession | null = null

  const run = async () => {
    const state: StreamState = {
      isInitialSession: true,
      lastCheckpointSequence: null,
      seenEventIds: new Set(),
    }

    while (!stopped && !signal?.aborted) {
      const session = subscribeCheckpoints({
        readMask: { paths: CHECKPOINT_STREAM_READ_MASK_PATHS },
      })
      activeSession = session

      try {
        await runSession(session, state, {
          eventTypes,
          idleMs,
          maxSessionMs,
          isStopped: () => stopped,
          onError,
          onEvents,
          onGap,
          signal,
        })
      } catch (error) {
        if (stopped || signal?.aborted) return
        onError?.(error)
      } finally {
        session.cancel()
        if (activeSession === session) activeSession = null
      }

      if (stopped || signal?.aborted) return

      try {
        await wait(reconnectMs, signal)
      } catch {
        return
      }
    }
  }

  const streamTask = run().catch((error) => {
    log.error(
      '[DappKit] Inventory checkpoint stream task exited unexpectedly:',
      error,
    )
  })

  return async () => {
    stopped = true
    activeSession?.cancel()
    await streamTask
  }
}
