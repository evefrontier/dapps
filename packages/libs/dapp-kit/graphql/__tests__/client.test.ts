import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  executeGraphQLQuery,
  getEntity,
  getObjectLatestVersion,
  getObjectOwner,
  getObjectWithDynamicFields,
  getObjectWithJson,
  getTableEntries,
} from '../client'
import {
  GET_ENTITY,
  GET_OBJECT_LATEST_VERSION,
  GET_OBJECT_OWNER,
  GET_OBJECT_WITH_DYNAMIC_FIELDS,
  GET_OBJECT_WITH_JSON,
  GET_TABLE_ENTRIES,
} from '../queries'

// ============================================================================
// Fetch mock helpers
// ============================================================================

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  })
}

// ============================================================================
// executeGraphQLQuery
// ============================================================================

describe('executeGraphQLQuery', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = mockFetch({ data: { object: null } })
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('makes a POST request with correct Content-Type', async () => {
    await executeGraphQLQuery('{ __typename }', {})
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0]!
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('encodes query and variables in the request body', async () => {
    const query = 'query Test { __typename }'
    const variables = { address: '0x123' }
    await executeGraphQLQuery(query, variables)
    const [, init] = fetchMock.mock.calls[0]!
    expect(JSON.parse(init.body)).toEqual({ query, variables })
  })

  it('resolves to the parsed JSON from a successful response', async () => {
    const payload = { data: { object: { address: '0xabc' } } }
    vi.stubGlobal('fetch', mockFetch(payload))
    const result = await executeGraphQLQuery('{ object }', {})
    expect(result).toEqual(payload)
  })

  it('throws an error for a 500 HTTP response', async () => {
    vi.stubGlobal('fetch', mockFetch({}, false, 500))
    await expect(executeGraphQLQuery('{ object }', {})).rejects.toThrow(
      'HTTP error! status: 500',
    )
  })

  it('calls getSuiGraphqlEndpoint() to determine the URL', async () => {
    await executeGraphQLQuery('{ __typename }', {})
    const [url] = fetchMock.mock.calls[0]!
    // Default endpoint is testnet
    expect(url).toContain('testnet.sui.io')
  })
})

// ============================================================================
// getObjectWithJson
// ============================================================================

describe('getObjectWithJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('passes GET_OBJECT_WITH_JSON query and address variable to fetch', async () => {
    const fetchMock = mockFetch({ data: {} })
    vi.stubGlobal('fetch', fetchMock)

    await getObjectWithJson('0xabc')

    const [, init] = fetchMock.mock.calls[0]!
    const body = JSON.parse(init.body)
    expect(body.query).toBe(GET_OBJECT_WITH_JSON)
    expect(body.variables).toEqual({ address: '0xabc' })
  })
})

// ============================================================================
// getObjectWithDynamicFields
// ============================================================================

describe('getObjectWithDynamicFields', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('passes GET_OBJECT_WITH_DYNAMIC_FIELDS query and objectId variable to fetch', async () => {
    const fetchMock = mockFetch({ data: {} })
    vi.stubGlobal('fetch', fetchMock)

    await getObjectWithDynamicFields('0xdef')

    const [, init] = fetchMock.mock.calls[0]!
    const body = JSON.parse(init.body)
    expect(body.query).toBe(GET_OBJECT_WITH_DYNAMIC_FIELDS)
    expect(body.variables).toEqual({ objectId: '0xdef' })
  })
})

// ============================================================================
// Entity helpers
// ============================================================================

describe('entity helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  async function sentBody(call: () => Promise<unknown>) {
    const fetchMock = mockFetch({ data: {} })
    vi.stubGlobal('fetch', fetchMock)
    await call()
    const [, init] = fetchMock.mock.calls[0]!
    return JSON.parse(init.body)
  }

  it('getEntity passes GET_ENTITY with default variables', async () => {
    const body = await sentBody(() => getEntity('0xabc'))

    expect(body.query).toBe(GET_ENTITY)
    expect(body.variables).toEqual({
      address: '0xabc',
      cursor: null,
      table_first: 50,
    })
  })

  it('getEntity passes cursor and tableFirst through', async () => {
    const body = await sentBody(() =>
      getEntity('0xabc', { cursor: 'next', tableFirst: 10 }),
    )

    expect(body.variables).toEqual({
      address: '0xabc',
      cursor: 'next',
      table_first: 10,
    })
  })

  it('getTableEntries passes GET_TABLE_ENTRIES with the table id', async () => {
    const body = await sentBody(() =>
      getTableEntries('0xtable', { after: 'c1' }),
    )

    expect(body.query).toBe(GET_TABLE_ENTRIES)
    expect(body.variables).toEqual({
      address: '0xtable',
      first: 50,
      after: 'c1',
    })
  })

  it('getObjectLatestVersion passes GET_OBJECT_LATEST_VERSION', async () => {
    const body = await sentBody(() => getObjectLatestVersion('0xabc'))

    expect(body.query).toBe(GET_OBJECT_LATEST_VERSION)
    expect(body.variables).toEqual({ address: '0xabc' })
  })

  it('getObjectOwner passes GET_OBJECT_OWNER', async () => {
    const body = await sentBody(() => getObjectOwner('0xcap'))

    expect(body.query).toBe(GET_OBJECT_OWNER)
    expect(body.variables).toEqual({ address: '0xcap' })
  })
})
