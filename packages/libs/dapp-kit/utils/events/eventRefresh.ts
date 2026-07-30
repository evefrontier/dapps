import { SuiGrpcClient } from '@mysten/sui/grpc'
import { createClient } from 'graphql-sse'

import {
  DEFAULT_EVENT_TRANSPORT,
  DEFAULT_GRAPHQL_NETWORK,
  type EventTransport,
  GRAPHQL_CLIENT_ID,
  getGraphqlSubscriptionAuthToken,
  getGraphqlSubscriptionEndpoint,
  getSuiGrpcBaseUrl,
} from '../constants'
import { createLogger } from '../logger'
import {
  type CheckpointStreamMessage,
  createInventoryCheckpointStream,
  type EventUnsubscribe,
} from './checkpointStream'
import {
  createGraphqlEventStream,
  type EventStreamClient,
  type StreamEventBatchHandler,
  type StreamGapHandler,
} from './graphqlEventStream'

const log = createLogger()

const EVENT_REFETCH_DELAYS_MS = [250, 1500, 3500] as const

export type ScheduledRefetch = (() => void) & { cancel: () => void }

export function createEventRefetchScheduler(
  refetch: () => Promise<void>,
  delaysMs: readonly number[] = EVENT_REFETCH_DELAYS_MS,
  onError?: (error: unknown) => void,
): ScheduledRefetch {
  let timeouts: ReturnType<typeof setTimeout>[] = []

  const scheduledRefetch = () => {
    scheduledRefetch.cancel()

    timeouts = delaysMs.map((delayMs) => {
      const timeoutId = setTimeout(() => {
        timeouts = timeouts.filter((timeout) => timeout !== timeoutId)
        refetch().catch((error) => onError?.(error))
      }, delayMs)
      return timeoutId
    })
  }

  scheduledRefetch.cancel = () => {
    for (const timeout of timeouts) {
      clearTimeout(timeout)
    }
    timeouts = []
  }

  return scheduledRefetch
}

/**
 * Subscribe to assembly Move events via the Sui fullnode gRPC checkpoint stream.
 * The checkpoint stream's `onGap` passes sequence numbers, which the consumer
 * ignores — so we adapt to the shared bare `() => void` gap signal.
 */
function subscribeViaGrpc({
  eventTypes,
  network,
  onEvents,
  onGap,
  signal,
}: {
  eventTypes: readonly string[]
  network: string
  onEvents?: StreamEventBatchHandler
  onGap?: StreamGapHandler
  signal?: AbortSignal
}): EventUnsubscribe {
  const unsubscribe = createInventoryCheckpointStream({
    eventTypes,
    ...(onEvents !== undefined ? { onEvents } : {}),
    ...(onGap !== undefined ? { onGap: () => onGap() } : {}),
    ...(signal !== undefined ? { signal } : {}),
    onError: (error) => {
      log.warn('[DappKit] Inventory checkpoint stream error:', error)
    },
    subscribeCheckpoints: (request) => {
      const abortController = new AbortController()
      const grpcClient = new SuiGrpcClient({
        network,
        baseUrl: getSuiGrpcBaseUrl(network),
      })
      const call = grpcClient.subscriptionService.subscribeCheckpoints(
        { readMask: { paths: [...request.readMask.paths] } },
        { abort: abortController.signal },
      )

      return {
        responses: call.responses as AsyncIterable<CheckpointStreamMessage>,
        cancel: () => {
          abortController.abort()
        },
      }
    },
  })

  signal?.addEventListener('abort', () => {
    void unsubscribe()
  })

  return unsubscribe
}

/**
 * Adapt a `graphql-sse` client to the transport-agnostic EventStreamClient the
 * stream consumes. Uses "distinct connections" mode (one SSE request per
 * subscription); the per-subscription `connected(reconnected)` listener drives
 * the gap signal. SSE runs over `fetch`, so X-Client-ID is a real header.
 */
function createGraphqlSseEventStreamClient(
  url: string,
  authToken: string | undefined,
): EventStreamClient & { dispose: () => void } {
  const client = createClient({
    url,
    headers: {
      'X-Client-ID': GRAPHQL_CLIENT_ID,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
  })

  return {
    subscribe: (payload, sink, onConnected) =>
      client.subscribe(payload, sink, {
        connected: (reconnected) => onConnected?.(reconnected),
      }),
    dispose: () => {
      client.dispose()
    },
  }
}

/** Subscribe to assembly Move events via the GraphQL SSE subscription endpoint. */
function subscribeViaSse({
  eventTypes,
  onEvents,
  onGap,
  signal,
}: {
  eventTypes: readonly string[]
  onEvents?: StreamEventBatchHandler
  onGap?: StreamGapHandler
  signal?: AbortSignal
}): EventUnsubscribe {
  const client = createGraphqlSseEventStreamClient(
    getGraphqlSubscriptionEndpoint(),
    getGraphqlSubscriptionAuthToken(),
  )

  const stop = createGraphqlEventStream({
    client,
    eventTypes,
    ...(onEvents !== undefined ? { onEvents } : {}),
    ...(onGap !== undefined ? { onGap } : {}),
    ...(signal !== undefined ? { signal } : {}),
    onError: (error) => {
      log.warn('[DappKit] GraphQL event subscription error:', error)
    },
  })

  return async () => {
    await stop()
    client.dispose()
  }
}

/**
 * Subscribe to assembly Move events, selecting the transport at runtime.
 *
 * Real-time source for the optimistic updates; the polling backstop remains the
 * fallback if the stream can't connect. Both transports deliver the same
 * `{ id, type, parsedJson }` event batches, so the consumer is transport-blind.
 * The name is kept for backwards compatibility; it now also carries fuel and
 * status events (filtered by `eventTypes`).
 */
export async function subscribeToAssemblyEvents({
  eventTypes,
  transport = DEFAULT_EVENT_TRANSPORT,
  network = DEFAULT_GRAPHQL_NETWORK,
  onEvents,
  onGap,
  signal,
}: {
  eventTypes: readonly string[]
  transport?: EventTransport
  network?: string
  onEvents?: StreamEventBatchHandler
  onGap?: StreamGapHandler
  signal?: AbortSignal
}): Promise<EventUnsubscribe> {
  log.info('[DappKit] Subscribing to assembly events', { transport })
  if (transport === 'sse') {
    return subscribeViaSse({
      eventTypes,
      ...(onEvents !== undefined ? { onEvents } : {}),
      ...(onGap !== undefined ? { onGap } : {}),
      ...(signal !== undefined ? { signal } : {}),
    })
  }
  return subscribeViaGrpc({
    eventTypes,
    network,
    ...(onEvents !== undefined ? { onEvents } : {}),
    ...(onGap !== undefined ? { onGap } : {}),
    ...(signal !== undefined ? { signal } : {}),
  })
}
