import {
  SUBSCRIPTION_CONNECT_TIMEOUT_MS,
  type SubscriptionStatus,
} from '../constants'
import { createLogger } from '../logger'
import { entityEventMatcher, isEventForEntity } from './entityEvents'
import {
  createGraphqlEventStream,
  type EventStreamClient,
} from './graphqlEventStream'
import {
  createEventRefetchScheduler,
  EVENT_REFETCH_DELAYS_MS,
} from './refetchScheduler'

const log = createLogger()

/**
 * Keep one entity up to date from a GraphQL event subscription: refetch when
 * an event about the entity arrives (a few times, for indexer lag), and once
 * after every reconnect to backfill what was missed.
 *
 * Reports `connecting`, then `live` on the first connect. Reports `failed`,
 * once, on a stream error, when `fail` is called (e.g. the endpoint serves no
 * subscriptions), or when nothing connects within `connectTimeoutMs`; it then
 * stops for good, so a broken endpoint is never retried in a loop. The caller
 * falls back to normal polling on `failed`.
 *
 * @returns `stop`, which ends it without reporting, and `fail`
 * @category Utilities - Events
 */
export function startEntitySubscription({
  client,
  eventTypes,
  entityId,
  refetch,
  onStatus,
  connectTimeoutMs = SUBSCRIPTION_CONNECT_TIMEOUT_MS,
  refetchDelaysMs = EVENT_REFETCH_DELAYS_MS,
}: {
  client: EventStreamClient
  eventTypes: readonly string[]
  entityId: string
  refetch: () => Promise<void>
  onStatus: (status: SubscriptionStatus) => void
  connectTimeoutMs?: number
  refetchDelaysMs?: readonly number[]
}): { stop: () => void; fail: (reason: unknown) => void } {
  const abort = new AbortController()
  let done = false
  let live = false

  const onRefetchError = (error: unknown) =>
    log.warn('[DappKit] Entity refetch after an event failed', error)
  const scheduled = createEventRefetchScheduler(
    refetch,
    refetchDelaysMs,
    onRefetchError,
  )

  const end = () => {
    done = true
    clearTimeout(timeout)
    scheduled.cancel()
    abort.abort()
  }

  const fail = (reason: unknown) => {
    if (done) return
    end()
    log.warn(
      '[DappKit] Entity subscription failed; falling back to polling',
      reason,
    )
    onStatus('failed')
  }

  const timeout = setTimeout(() => {
    if (!live) fail(new Error(`No connection within ${connectTimeoutMs} ms`))
  }, connectTimeoutMs)

  onStatus('connecting')
  createGraphqlEventStream({
    client,
    eventTypes,
    isTracked: entityEventMatcher(eventTypes),
    signal: abort.signal,
    onConnected: () => {
      if (done || live) return
      live = true
      clearTimeout(timeout)
      log.info('[DappKit] Entity subscription live', { entityId })
      onStatus('live')
    },
    onEvents: (events) => {
      if (events.some((event) => isEventForEntity(event, entityId))) {
        scheduled()
      }
    },
    onGap: () => {
      refetch().catch(onRefetchError)
    },
    onError: fail,
  })

  return {
    stop: () => {
      if (!done) end()
    },
    fail,
  }
}
