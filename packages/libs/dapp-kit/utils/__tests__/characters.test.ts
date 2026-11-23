import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../graphql/client', () => ({
  getEventsByType: vi.fn(),
}))

import { getEventsByType } from '../../graphql/client'
import type { CharacterSummary } from '../../types'
import {
  fetchCharacterDirectory,
  searchCharacters,
  searchIndexedCharacters,
} from '../characters'
import { FENRIS_INDEXER_URL } from '../constants'

// ============================================================================
// GraphQL client mock helpers
// ============================================================================

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

/** Answers getEventsByType per event type; each type's pages keyed by cursor. */
function mockEvents(pages: {
  created: Record<string, unknown>
  renamed: Record<string, unknown>
}) {
  vi.mocked(getEventsByType).mockImplementation(async (eventType, options) => {
    const source = eventType.endsWith('::identity::CharacterCreated')
      ? pages.created
      : pages.renamed
    return source[options?.after ?? ''] as Awaited<
      ReturnType<typeof getEventsByType>
    >
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
    vi.mocked(getEventsByType).mockReset()
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
    mockEvents({
      created: { '': eventsPage([]) },
      renamed: { '': eventsPage([]) },
    })

    await fetchCharacterDirectory()

    const types = vi.mocked(getEventsByType).mock.calls.map(([type]) => type)
    expect(types).toEqual([
      expect.stringMatching(/^0x[0-9a-f]{64}::identity::CharacterCreated$/),
      expect.stringMatching(/^0x[0-9a-f]{64}::metadata::MetadataChanged$/),
    ])
  })

  it('throws on GraphQL errors', async () => {
    vi.mocked(getEventsByType).mockResolvedValue({
      errors: [{ message: 'boom' }],
    } as Awaited<ReturnType<typeof getEventsByType>>)

    await expect(fetchCharacterDirectory()).rejects.toThrow('boom')
  })
})

// ============================================================================
// searchCharacters
// ============================================================================

const WALLET_A = `0x${'a1'.repeat(32)}`
const WALLET_B = `0x${'b2'.repeat(32)}`
const CHAR_A = `0x${'c3'.repeat(32)}`
const CHAR_B = `0x${'d4'.repeat(32)}`

const characters: CharacterSummary[] = [
  {
    characterId: CHAR_A,
    name: 'Nova Prime',
    walletAddress: WALLET_A,
  },
  {
    characterId: CHAR_B,
    name: 'Supernova',
    walletAddress: WALLET_B,
  },
  {
    characterId: `0x${'e5'.repeat(32)}`,
    name: '',
    walletAddress: `0x${'f6'.repeat(32)}`,
  },
]

describe('searchCharacters', () => {
  it('matches names case-insensitively, prefix matches first', () => {
    expect(searchCharacters(characters, 'NOVA').map((c) => c.name)).toEqual([
      'Nova Prime',
      'Supernova',
    ])
  })

  it('ignores surrounding whitespace', () => {
    expect(searchCharacters(characters, '  prime ')).toEqual([characters[0]])
  })

  it('never matches a wallet address or character id', () => {
    expect(searchCharacters(characters, WALLET_B)).toEqual([])
    expect(searchCharacters(characters, '0xA1A1')).toEqual([])
    expect(searchCharacters(characters, CHAR_A)).toEqual([])
  })

  it('searches only names, not addresses without the 0x prefix', () => {
    expect(searchCharacters(characters, 'a1a1')).toEqual([])
  })

  it('returns nothing for an empty query', () => {
    expect(searchCharacters(characters, '   ')).toEqual([])
  })

  it('caps the number of results', () => {
    expect(searchCharacters(characters, 'nova', 1)).toHaveLength(1)
  })
})

// ============================================================================
// searchIndexedCharacters
// ============================================================================

describe('searchIndexedCharacters', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  const respond = (body: unknown, ok = true, status = 200) =>
    fetchMock.mockResolvedValue({ ok, status, json: async () => body })

  const sentBody = () => JSON.parse(fetchMock.mock.calls[0]?.[1].body)

  it('maps indexer characters to summaries', async () => {
    respond({
      data: {
        characters: [
          {
            displayName: 'Grauz',
            characterId: '0xc1',
            characterAddress: '0xw1',
          },
          { displayName: null, characterId: '0xc2', characterAddress: '0xw2' },
        ],
      },
    })

    await expect(searchIndexedCharacters('rau')).resolves.toEqual([
      { characterId: '0xc1', name: 'Grauz', walletAddress: '0xw1' },
      { characterId: '0xc2', name: '', walletAddress: '0xw2' },
    ])
    expect(fetchMock.mock.calls[0]?.[0]).toBe(FENRIS_INDEXER_URL)
  })

  it('sends the trimmed query, tenant and limit', async () => {
    respond({ data: { characters: [] } })

    await searchIndexedCharacters('  rau ', { tenant: 'stillness', limit: 8 })

    expect(sentBody().variables).toEqual({
      search: 'rau',
      tenantId: 'stillness',
      limit: 8,
    })
  })

  it('searches every tenant when none is given', async () => {
    respond({ data: { characters: [] } })

    await searchIndexedCharacters('rau')

    expect(sentBody().variables).toEqual({
      search: 'rau',
      tenantId: null,
      limit: 20,
    })
  })

  it('uses VITE_FENRIS_INDEXER_URL when set', async () => {
    vi.stubEnv('VITE_FENRIS_INDEXER_URL', 'http://localhost:9000/graphql')
    respond({ data: { characters: [] } })

    await searchIndexedCharacters('rau')

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:9000/graphql')
  })

  it('never sends an empty query or an address', async () => {
    await expect(searchIndexedCharacters('   ')).resolves.toEqual([])
    await expect(searchIndexedCharacters('0xA1A1')).resolves.toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('throws on GraphQL errors', async () => {
    respond({ errors: [{ message: 'bad search' }] })

    await expect(searchIndexedCharacters('rau')).rejects.toThrow('bad search')
  })

  it('throws on an HTTP error', async () => {
    respond({}, false, 502)

    await expect(searchIndexedCharacters('rau')).rejects.toThrow('502')
  })
})
