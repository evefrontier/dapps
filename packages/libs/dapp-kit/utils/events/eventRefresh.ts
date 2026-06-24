import { SuiGrpcClient } from '@mysten/sui/grpc'

import { DEFAULT_GRAPHQL_NETWORK, getSuiGrpcBaseUrl } from '../constants'
import { createLogger } from '../logger'
import {
  type CheckpointGapHandler,
  type CheckpointStreamMessage,
  createInventoryCheckpointStream,
  type EventUnsubscribe,
  type InventoryEventBatchHandler,
} from './checkpointStream'

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

export async function subscribeToInventoryEvents({
  eventTypes,
  network = DEFAULT_GRAPHQL_NETWORK,
  onEvents,
  onGap,
  signal,
}: {
  eventTypes: readonly string[]
  network?: string
  onEvents?: InventoryEventBatchHandler
  onGap?: CheckpointGapHandler
  signal?: AbortSignal
}): Promise<EventUnsubscribe> {
  const unsubscribe = createInventoryCheckpointStream({
    eventTypes,
    ...(onEvents !== undefined ? { onEvents } : {}),
    ...(onGap !== undefined ? { onGap } : {}),
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
        {
          readMask: {
            paths: [...request.readMask.paths],
          },
        },
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
