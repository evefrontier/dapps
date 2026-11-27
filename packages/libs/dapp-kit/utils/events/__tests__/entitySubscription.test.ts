import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SubscriptionStatus } from '../../constants'
import { startEntitySubscription } from '../entitySubscription'
import type { EventStreamClient, EventStreamSink } from '../graphqlEventStream'
import { createEventRefetchScheduler } from '../refetchScheduler'

const INVENTORY = `0x${'1'.repeat(64)}`
const POWER = `0x${'2'.repeat(64)}`
const ENTITY = `0x${'e'.repeat(64)}`
const EVENT_TYPES = [
  `${INVENTORY}::item::ItemsDeposited`,
  `${POWER}::power_grid::PowerToggled`,
]

/** A controllable EventStreamClient, one subscription per package. */
function createMockClient() {
  const subs: Array<{
    sink: EventStreamSink
    onConnected: ((reconnected: boolean) => void) | undefined
    dispose: ReturnType<typeof vi.fn>
  }> = []
  const client: EventStreamClient = {
    subscribe: (_payload, sink, onConnected) => {
      const dispose = vi.fn()
      subs.push({ sink, onConnected, dispose })
      return dispose
    },
  }
  return {
    client,
    subs,
    connect: (reconnected = false) => subs[0]?.onConnected?.(reconnected),
    deliver: (type: string, json: Record<string, unknown>, tx = 'tx1') =>
      subs[0]?.sink.next({
        data: {
          events: {
            cursor: tx,
            node: {
              sequenceNumber: '0',
              transaction: { digest: tx },
              contents: { type: { repr: type }, json },
            },
          },
        },
      }),
    error: (err: unknown) => subs[0]?.sink.error(err),
  }
}

function start(overrides: { connectTimeoutMs?: number } = {}) {
  const mock = createMockClient()
  const statuses: SubscriptionStatus[] = []
  const refetch = vi.fn(async () => {})
  const subscription = startEntitySubscription({
    client: mock.client,
    eventTypes: EVENT_TYPES,
    entityId: ENTITY,
    refetch,
    onStatus: (status) => statuses.push(status),
    connectTimeoutMs: overrides.connectTimeoutMs ?? 10_000,
    refetchDelaysMs: [250, 1500],
  })
  return { mock, statuses, refetch, subscription }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('startEntitySubscription', () => {
  it('opens one subscription per package and goes live on the first connect', () => {
    const { mock, statuses } = start()
    expect(mock.subs).toHaveLength(2)
    expect(statuses).toEqual(['connecting'])
    mock.connect()
    mock.subs[1]?.onConnected?.(false)
    expect(statuses).toEqual(['connecting', 'live'])
  })

  it('refetches a few times after an event about the entity, for indexer lag', async () => {
    const { mock, refetch } = start()
    mock.connect()
    mock.deliver(`${INVENTORY}::item::ItemsDeposited`, { entity_id: ENTITY })
    expect(refetch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(250)
    expect(refetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1250)
    expect(refetch).toHaveBeenCalledTimes(2)
  })

  it("ignores other entities' events", async () => {
    const { mock, refetch } = start()
    mock.connect()
    mock.deliver(`${POWER}::power_grid::PowerToggled`, { entity_id: '0x9' })
    await vi.advanceTimersByTimeAsync(5_000)
    expect(refetch).not.toHaveBeenCalled()
  })

  it('refetches once right away after a reconnect', () => {
    const { mock, refetch } = start()
    mock.connect()
    mock.connect(true)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('fails once on a stream error and stops every subscription', async () => {
    const { mock, statuses, refetch } = start()
    mock.connect()
    mock.deliver(`${INVENTORY}::item::ItemsDeposited`, { entity_id: ENTITY })
    mock.error(new Error('gone'))
    mock.error(new Error('gone again'))
    expect(statuses).toEqual(['connecting', 'live', 'failed'])
    for (const sub of mock.subs) expect(sub.dispose).toHaveBeenCalled()
    // The pending refetches are dropped with it
    await vi.advanceTimersByTimeAsync(5_000)
    expect(refetch).not.toHaveBeenCalled()
  })

  it('fails when nothing connects in time', async () => {
    const { statuses } = start({ connectTimeoutMs: 10_000 })
    await vi.advanceTimersByTimeAsync(9_999)
    expect(statuses).toEqual(['connecting'])
    await vi.advanceTimersByTimeAsync(1)
    expect(statuses).toEqual(['connecting', 'failed'])
  })

  it('does not time out once live', async () => {
    const { mock, statuses } = start({ connectTimeoutMs: 10_000 })
    mock.connect()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(statuses).toEqual(['connecting', 'live'])
  })

  it('fails on demand, e.g. when the endpoint serves no subscriptions', () => {
    const { subscription, statuses, mock } = start()
    subscription.fail(new Error('not an event stream'))
    mock.connect()
    expect(statuses).toEqual(['connecting', 'failed'])
  })

  it('stops quietly', async () => {
    const { subscription, statuses, mock } = start()
    subscription.stop()
    await vi.advanceTimersByTimeAsync(20_000)
    mock.connect()
    expect(statuses).toEqual(['connecting'])
    for (const sub of mock.subs) expect(sub.dispose).toHaveBeenCalled()
  })
})

describe('createEventRefetchScheduler', () => {
  it('refetches first, then confirms, after one event', async () => {
    const refetch = vi.fn(async () => {})
    const scheduled = createEventRefetchScheduler(refetch, [250, 1500, 3500])
    scheduled()
    await vi.advanceTimersByTimeAsync(249)
    expect(refetch).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(refetch).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1250)
    expect(refetch).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(2000)
    expect(refetch).toHaveBeenCalledTimes(3)
  })

  it('does not postpone a pending first refetch', async () => {
    const refetch = vi.fn(async () => {})
    const scheduled = createEventRefetchScheduler(refetch, [250, 1500])
    scheduled()
    await vi.advanceTimersByTimeAsync(200)
    scheduled()
    await vi.advanceTimersByTimeAsync(50)
    // Still 250 ms after the first event, not after the second
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('keeps refetching through a steady stream of events, then confirms after the last', async () => {
    const refetch = vi.fn(async () => {})
    const scheduled = createEventRefetchScheduler(refetch, [250, 1500, 3500])
    // An event every 100 ms for 2 s, the last at 1900 ms
    for (let i = 0; i < 20; i++) {
      scheduled()
      await vi.advanceTimersByTimeAsync(100)
    }
    // First refetches at 250, 550, 850, 1150, 1450 and 1750 ms; the
    // confirmations keep moving with the stream
    expect(refetch).toHaveBeenCalledTimes(6)
    // The pending first (2050 ms), then the confirmations 1.5 s and 3.5 s
    // after the last event (3400 and 5400 ms)
    await vi.advanceTimersByTimeAsync(3400)
    expect(refetch).toHaveBeenCalledTimes(9)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(refetch).toHaveBeenCalledTimes(9)
  })

  it('reports a failed refetch and can be cancelled', async () => {
    const onError = vi.fn()
    const refetch = vi.fn(async () => {
      throw new Error('indexer down')
    })
    const scheduled = createEventRefetchScheduler(refetch, [100, 200], onError)
    scheduled()
    await vi.advanceTimersByTimeAsync(100)
    expect(onError).toHaveBeenCalledTimes(1)
    scheduled.cancel()
    await vi.advanceTimersByTimeAsync(500)
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('cancels a pending first refetch as well as the confirmations', async () => {
    const refetch = vi.fn(async () => {})
    const scheduled = createEventRefetchScheduler(refetch, [250, 1500])
    scheduled()
    scheduled.cancel()
    await vi.advanceTimersByTimeAsync(5_000)
    expect(refetch).not.toHaveBeenCalled()
    // And it schedules afresh afterwards
    scheduled()
    await vi.advanceTimersByTimeAsync(250)
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
