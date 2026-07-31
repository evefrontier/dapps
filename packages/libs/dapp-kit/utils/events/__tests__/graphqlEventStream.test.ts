import { describe, expect, it, vi } from 'vitest'
import {
  createGraphqlEventStream,
  deriveEventFilters,
  type EventStreamClient,
  type EventStreamSink,
  extractEventsFromSubscription,
} from '../graphqlEventStream'
import { getInventoryEventTypes } from '../inventoryEventHandlers'

const PACKAGE_ID =
  '0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c'
const OTHER_PACKAGE_ID =
  '0x99b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce1270000'
const BURNED = `${PACKAGE_ID}::inventory::ItemBurnedEvent`
const MINTED = `${PACKAGE_ID}::inventory::ItemMintedEvent`
const EVENT_TYPES = getInventoryEventTypes(PACKAGE_ID)

/** Build an `EventEdge` payload matching Sui's `Subscription.events` shape. */
function eventEdge(type: string, txDigest: string, eventSeq = '0') {
  return {
    cursor: `${txDigest}:${eventSeq}`,
    node: {
      sequenceNumber: eventSeq,
      transaction: { digest: txDigest },
      contents: {
        type: { repr: type },
        json: { assembly_id: '0xabc', quantity: 5, type_id: '77810' },
      },
    },
  }
}

/**
 * A controllable EventStreamClient: capture each subscription's sink and
 * connected handler so tests can push payloads and simulate (re)connects.
 */
function createMockClient() {
  const subs: Array<{
    payload: { query: string; variables: Record<string, unknown> }
    sink: EventStreamSink
    onConnected: ((reconnected: boolean) => void) | undefined
    dispose: ReturnType<typeof vi.fn>
  }> = []

  const client: EventStreamClient = {
    subscribe: (payload, sink, onConnected) => {
      const dispose = vi.fn()
      subs.push({ payload, sink, onConnected, dispose })
      return dispose
    },
  }

  return {
    client,
    subs,
    emit: (value: unknown) => subs[0]?.sink.next(value),
    error: (err: unknown) => subs[0]?.sink.error(err),
    connect: (reconnected: boolean) => {
      for (const sub of subs) sub.onConnected?.(reconnected)
    },
  }
}

describe('deriveEventFilters', () => {
  it('returns one filter per distinct package', () => {
    expect(deriveEventFilters(EVENT_TYPES)).toEqual([{ type: PACKAGE_ID }])
  })

  it('dedupes packages across many event types', () => {
    const filters = deriveEventFilters([
      `${PACKAGE_ID}::inventory::ItemMintedEvent`,
      `${PACKAGE_ID}::fuel::FuelEvent`,
      `${OTHER_PACKAGE_ID}::status::StatusChangedEvent`,
    ])
    expect(filters).toEqual([{ type: PACKAGE_ID }, { type: OTHER_PACKAGE_ID }])
  })
})

describe('extractEventsFromSubscription', () => {
  it('maps an EventEdge payload to a StreamEvent', () => {
    const events = extractEventsFromSubscription(
      { data: { events: eventEdge(MINTED, 'abc123', '4') } },
      EVENT_TYPES,
    )
    expect(events).toEqual([
      {
        id: { txDigest: 'abc123', eventSeq: '4' },
        type: MINTED,
        parsedJson: { assembly_id: '0xabc', quantity: 5, type_id: '77810' },
      },
    ])
  })

  it('tolerates a pre-unwrapped payload and a list of edges', () => {
    const events = extractEventsFromSubscription(
      { events: [eventEdge(BURNED, 'a'), eventEdge(MINTED, 'b')] },
      EVENT_TYPES,
    )
    expect(events.map((e) => e.type)).toEqual([BURNED, MINTED])
  })

  it('falls back to the edge cursor when the tx digest is absent', () => {
    const edge = {
      cursor: 'cursor-abc',
      node: {
        sequenceNumber: '0',
        contents: { type: { repr: MINTED }, json: { type_id: '1' } },
      },
    }
    const events = extractEventsFromSubscription(
      { data: { events: edge } },
      EVENT_TYPES,
    )
    expect(events[0]?.id.txDigest).toBe('cursor-abc')
  })

  it('drops events of an untracked type', () => {
    const events = extractEventsFromSubscription(
      {
        data: { events: eventEdge(`${PACKAGE_ID}::storage_unit::Other`, 'x') },
      },
      EVENT_TYPES,
    )
    expect(events).toEqual([])
  })

  it('drops malformed edges (missing contents.json or type.repr)', () => {
    const events = extractEventsFromSubscription(
      {
        data: {
          events: [
            { cursor: 'a', node: { contents: { type: { repr: MINTED } } } }, // no json
            { cursor: 'b', node: { contents: { json: {} } } }, // no type.repr
          ],
        },
      },
      EVENT_TYPES,
    )
    expect(events).toEqual([])
  })
})

describe('createGraphqlEventStream', () => {
  it('opens one subscription per package filter', () => {
    const mock = createMockClient()
    createGraphqlEventStream({
      client: mock.client,
      eventTypes: [
        `${PACKAGE_ID}::inventory::ItemMintedEvent`,
        `${OTHER_PACKAGE_ID}::fuel::FuelEvent`,
      ],
    })
    expect(mock.subs).toHaveLength(2)
    expect(mock.subs.map((s) => s.payload.variables['filter'])).toEqual([
      { type: PACKAGE_ID },
      { type: OTHER_PACKAGE_ID },
    ])
  })

  it('delivers subscription events to onEvents as a batch', () => {
    const onEvents = vi.fn()
    const mock = createMockClient()
    createGraphqlEventStream({
      client: mock.client,
      eventTypes: EVENT_TYPES,
      onEvents,
    })

    mock.emit({ data: { events: eventEdge(BURNED, 'tx1') } })
    mock.emit({ data: { events: eventEdge(MINTED, 'tx2') } })

    expect(onEvents).toHaveBeenCalledTimes(2)
    expect(onEvents).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({ type: BURNED }),
    ])
    expect(onEvents).toHaveBeenNthCalledWith(2, [
      expect.objectContaining({ type: MINTED }),
    ])
  })

  it('deduplicates events by txDigest:eventSeq across emissions', () => {
    const onEvents = vi.fn()
    const mock = createMockClient()
    createGraphqlEventStream({
      client: mock.client,
      eventTypes: EVENT_TYPES,
      onEvents,
    })

    mock.emit({ data: { events: eventEdge(BURNED, 'dup') } })
    mock.emit({ data: { events: eventEdge(BURNED, 'dup') } })

    expect(onEvents).toHaveBeenCalledTimes(1)
  })

  it('does not call onEvents when an emission has no relevant events', () => {
    const onEvents = vi.fn()
    const mock = createMockClient()
    createGraphqlEventStream({
      client: mock.client,
      eventTypes: EVENT_TYPES,
      onEvents,
    })

    mock.emit({ data: { events: eventEdge(`${PACKAGE_ID}::x::Other`, 't') } })
    expect(onEvents).not.toHaveBeenCalled()
  })

  it('fires onGap on reconnect but not on the initial connect', () => {
    const onGap = vi.fn()
    const mock = createMockClient()
    createGraphqlEventStream({
      client: mock.client,
      eventTypes: EVENT_TYPES,
      onGap,
    })

    mock.connect(false) // initial connect — no backfill needed
    expect(onGap).not.toHaveBeenCalled()

    mock.connect(true) // reconnect
    expect(onGap).toHaveBeenCalledTimes(1)
  })

  it('routes subscription errors to onError', () => {
    const onError = vi.fn()
    const mock = createMockClient()
    createGraphqlEventStream({
      client: mock.client,
      eventTypes: EVENT_TYPES,
      onError,
    })

    const err = new Error('stream closed')
    mock.error(err)
    expect(onError).toHaveBeenCalledWith(err)
  })

  it('stops delivering and disposes every subscription after unsubscribe', async () => {
    const onEvents = vi.fn()
    const mock = createMockClient()
    const stop = createGraphqlEventStream({
      client: mock.client,
      eventTypes: [
        `${PACKAGE_ID}::inventory::ItemMintedEvent`,
        `${OTHER_PACKAGE_ID}::fuel::FuelEvent`,
      ],
      onEvents,
    })

    await stop()

    expect(mock.subs).toHaveLength(2)
    for (const sub of mock.subs) expect(sub.dispose).toHaveBeenCalledTimes(1)

    mock.emit({ data: { events: eventEdge(BURNED, 'after-stop') } })
    expect(onEvents).not.toHaveBeenCalled()
  })

  it('stops when its abort signal fires', () => {
    const onEvents = vi.fn()
    const mock = createMockClient()
    const controller = new AbortController()

    createGraphqlEventStream({
      client: mock.client,
      eventTypes: EVENT_TYPES,
      onEvents,
      signal: controller.signal,
    })

    controller.abort()
    for (const sub of mock.subs) expect(sub.dispose).toHaveBeenCalled()

    mock.emit({ data: { events: eventEdge(BURNED, 'aborted') } })
    expect(onEvents).not.toHaveBeenCalled()
  })
})
