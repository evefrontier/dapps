import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchCharacterDirectory } from '../characters'

// ============================================================================
// Fetch mock helpers
// ============================================================================

type Responder = (variables: Record<string, unknown>) => unknown

/** Stubs fetch, answering each GraphQL operation by its name. */
function mockGraphql(responders: Record<string, Responder>) {
  const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
    const { query, variables } = JSON.parse(init.body)
    const operation = Object.keys(responders).find((name) =>
      query.includes(`query ${name}(`),
    )
    if (!operation) throw new Error(`Unexpected query: ${query}`)
    return {
      ok: true,
      status: 200,
      json: () => Promise.resolve(responders[operation]!(variables)),
    }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const eventsPage = (jsons: unknown[], endCursor: string | null = null) => ({
  data: {
    events: {
      pageInfo: { hasNextPage: endCursor !== null, endCursor },
      nodes: jsons.map((json, i) => ({
        sequenceNumber: i,
        timestamp: null,
        contents: { json },
      })),
    },
  },
})

const created = (id: string, wallet: string) => ({
  character_id: id,
  key: { id: '1', tenant: 'test' },
  character_address: wallet,
})

const renamed = (id: string, name: string) => ({
  entity_id: id,
  entity_key: { id: '1', tenant: 'test' },
  name,
  description: '',
  url: '',
})

/** Answers GetEventsByType per event type; each type's pages keyed by cursor. */
function mockEvents(pages: {
  created: Record<string, unknown>
  renamed: Record<string, unknown>
}) {
  return mockGraphql({
    GetEventsByType: (variables) => {
      const { event_type, after } = variables as {
        event_type: string
        after?: string
      }
      const source = event_type.endsWith('::identity::CharacterCreated')
        ? pages.created
        : pages.renamed
      return source[after ?? '']
    },
  })
}

// ============================================================================
// fetchCharacterDirectory
// ============================================================================

describe('fetchCharacterDirectory', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_EVE_WORLD_TIER', 'dev')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('joins characters with their latest name across pages', async () => {
    mockEvents({
      created: {
        '': eventsPage([created('0xc1', '0xw1')], 'c1'),
        c1: eventsPage([created('0xc2', '0xw2')]),
      },
      renamed: {
        '': eventsPage([renamed('0xc1', 'Old Name')], 'r1'),
        r1: eventsPage([renamed('0xc1', 'New Name')]),
      },
    })

    expect(await fetchCharacterDirectory()).toEqual([
      {
        characterId: '0xc1',
        name: 'New Name',
        walletAddress: '0xw1',
      },
      {
        characterId: '0xc2',
        name: '',
        walletAddress: '0xw2',
      },
    ])
  })

  it('ignores metadata of entities that are not characters', async () => {
    mockEvents({
      created: { '': eventsPage([created('0xc1', '0xw1')]) },
      renamed: { '': eventsPage([renamed('0xassembly', 'My Gate')]) },
    })

    const characters = await fetchCharacterDirectory()

    expect(characters.map((c) => c.characterId)).toEqual(['0xc1'])
  })

  it('resolves both event types for the world tier', async () => {
    const fetchMock = mockEvents({
      created: { '': eventsPage([]) },
      renamed: { '': eventsPage([]) },
    })

    await fetchCharacterDirectory()

    const types = fetchMock.mock.calls.map(
      ([, init]) => JSON.parse(init.body).variables.event_type,
    )
    expect(types).toEqual([
      expect.stringMatching(/^0x[0-9a-f]{64}::identity::CharacterCreated$/),
      expect.stringMatching(/^0x[0-9a-f]{64}::metadata::MetadataChanged$/),
    ])
  })

  it('throws on GraphQL errors', async () => {
    mockGraphql({
      GetEventsByType: () => ({ errors: [{ message: 'boom' }] }),
    })

    await expect(fetchCharacterDirectory()).rejects.toThrow('boom')
  })
})
