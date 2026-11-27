import {
  SUBSCRIPTION_CONNECT_TIMEOUT_MS,
  type SubscriptionStatus,
} from '../constants'
import { createLogger } from '../logger'
import { entityEventMatcher, isEventForEntity } from './entityEvents'
import {
  createGraphqlEventStream,
  deriveEventFilters,
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
 * There is one stream per world package. Reports `connecting`, then `live`
 * once every stream has connected. Reports `failed`, once, on a stream error,
 * when `fail` is called (e.g. the endpoint serves no subscriptions), or when
 * any stream has not connected within `connectTimeoutMs`; it then stops for
 * good, so a broken endpoint is never retried in a loop. The caller falls back
 * to normal polling on `failed`.
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
  const expected = deriveEventFilters(eventTypes).map((filter) => filter.type)
  const connected = new Set<string>()

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
    if (live) return
    const missing = expected.filter((filter) => !connected.has(filter))
    fail(
      new Error(
        `No connection within ${connectTimeoutMs} ms for ${missing.join(', ')}`,
      ),
    )
  }, connectTimeoutMs)

  onStatus('connecting')
  createGraphqlEventStream({
    client,
    eventTypes,
    isTracked: entityEventMatcher(eventTypes),
    signal: abort.signal,
    onConnected: (_reconnected, filter) => {
      if (done || live) return
      connected.add(filter)
      // Polling slows to the backstop only once every package is covered
      if (expected.some((type) => !connected.has(type))) return
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
