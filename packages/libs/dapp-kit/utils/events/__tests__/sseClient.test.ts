import { describe, expect, it, vi } from 'vitest'
import {
  assertEventStream,
  createGraphqlSseEventStreamClient,
  SubscriptionsUnsupportedError,
} from '../sseClient'

const localnetReply = () =>
  new Response(
    JSON.stringify({
      data: null,
      errors: [{ message: 'Schema is not configured for subscriptions.' }],
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  )

describe('assertEventStream', () => {
  it('passes an event stream through', async () => {
    const res = new Response('', {
      status: 200,
      headers: { 'content-type': 'text/event-stream; charset=utf-8' },
    })
    await expect(assertEventStream(res)).resolves.toBe(res)
  })

  it('rejects a successful reply that is not an event stream, with its reason', async () => {
    await expect(assertEventStream(localnetReply())).rejects.toThrow(
      /application\/json: .*not configured for subscriptions/,
    )
    await expect(assertEventStream(localnetReply())).rejects.toBeInstanceOf(
      SubscriptionsUnsupportedError,
    )
  })

  it('passes passing failures through for the client to retry', async () => {
    const res = new Response('busy', { status: 503 })
    await expect(assertEventStream(res)).resolves.toBe(res)
  })

  it('rejects a URL that serves no subscriptions, as a localnet answers', async () => {
    const res = new Response(
      'Subscriptions are not enabled on this instance.',
      {
        status: 404,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      },
    )
    await expect(assertEventStream(res)).rejects.toThrow(
      'Subscription endpoint answered 404: Subscriptions are not enabled on this instance.',
    )
  })
})

describe('createGraphqlSseEventStreamClient', () => {
  it('reports an endpoint without subscriptions straight away, with the client id header', async () => {
    const fetchFn = vi.fn(async () => localnetReply())
    const onUnsupported = vi.fn()
    const client = createGraphqlSseEventStreamClient({
      url: 'http://127.0.0.1:9125/graphql',
      authToken: 'token',
      onUnsupported,
      fetchFn,
    })
    const sink = { next: vi.fn(), error: vi.fn(), complete: vi.fn() }
    const onConnected = vi.fn()
    const dispose = client.subscribe(
      { query: 'subscription { events { cursor } }', variables: {} },
      sink,
      onConnected,
    )
    await vi.waitFor(() => expect(onUnsupported).toHaveBeenCalledTimes(1))
    expect(onUnsupported.mock.calls[0]?.[0]).toBeInstanceOf(
      SubscriptionsUnsupportedError,
    )
    expect(onConnected).not.toHaveBeenCalled()
    const headers = new Headers(
      (fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].headers,
    )
    expect(headers.get('x-client-id')).toMatch(/^[0-9a-f-]{36}$/)
    expect(headers.get('authorization')).toBe('Bearer token')
    expect(headers.get('accept')).toBe('text/event-stream')
    dispose()
    client.dispose()
  })
})
