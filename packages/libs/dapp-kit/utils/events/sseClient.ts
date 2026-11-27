import { createClient } from 'graphql-sse'
import { GRAPHQL_CLIENT_ID } from '../constants'
import type { EventStreamClient } from './graphqlEventStream'

/**
 * The endpoint answered, but not with an event stream: it does not serve
 * GraphQL subscriptions (a localnet replies `200 application/json` with
 * "Schema is not configured for subscriptions"). Not worth retrying.
 *
 * @category Utilities - Events
 */
export class SubscriptionsUnsupportedError extends Error {
  override name = 'SubscriptionsUnsupportedError'
}

/**
 * Statuses that mean the URL serves no subscriptions at all, rather than a
 * passing failure (a localnet answers 404 "Subscriptions are not enabled on
 * this instance" on `/graphql/subscriptions`).
 */
const UNSUPPORTED_STATUSES = new Set([404, 405, 501])

async function reason(res: Response): Promise<string> {
  try {
    const text = (await res.text()).trim().slice(0, 200)
    return text ? `: ${text}` : ''
  } catch {
    // The reason is a nicety; the status or content type already decides
    return ''
  }
}

/**
 * Pass an SSE response through, or throw {@link SubscriptionsUnsupportedError}
 * when the URL serves no subscriptions: a 404, 405 or 501, or a successful
 * response that is not `text/event-stream`. Other error statuses pass through
 * for `graphql-sse` to retry as network errors.
 *
 * @category Utilities - Events
 */
export async function assertEventStream(res: Response): Promise<Response> {
  if (UNSUPPORTED_STATUSES.has(res.status)) {
    throw new SubscriptionsUnsupportedError(
      `Subscription endpoint answered ${res.status}${await reason(res)}`,
    )
  }
  if (!res.ok) return res
  const type = res.headers.get('content-type') ?? ''
  if (type.includes('text/event-stream')) return res
  throw new SubscriptionsUnsupportedError(
    `Expected an event stream, got ${type || 'no content type'}${await reason(res)}`,
  )
}

/**
 * Adapt a `graphql-sse` client to the transport-agnostic EventStreamClient the
 * stream consumes. Uses "distinct connections" mode (one SSE request per
 * subscription); the per-subscription `connected(reconnected)` listener drives
 * the gap signal. SSE runs over `fetch`, so X-Client-ID is a real header.
 *
 * `graphql-sse` reports a connect as soon as the response arrives, before
 * reading it, and retries network errors. `onUnsupported` fires as soon as a
 * response turns out not to be an event stream, so the caller can stop before
 * any retries.
 *
 * @category Utilities - Events
 */
export function createGraphqlSseEventStreamClient({
  url,
  authToken,
  onUnsupported,
  fetchFn = globalThis.fetch,
}: {
  url: string
  authToken?: string | undefined
  onUnsupported?: (error: SubscriptionsUnsupportedError) => void
  fetchFn?: typeof fetch
}): EventStreamClient & { dispose: () => void } {
  const client = createClient({
    url,
    headers: {
      'X-Client-ID': GRAPHQL_CLIENT_ID,
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    fetchFn: async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await fetchFn(input, init)
      try {
        return await assertEventStream(res)
      } catch (error) {
        if (error instanceof SubscriptionsUnsupportedError) {
          onUnsupported?.(error)
        }
        throw error
      }
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
