import { getEventsByType } from '../graphql/client'
import type { EventNode, GraphQLResponse } from '../graphql/types'
import type { CharacterSummary } from '../types'
import { getFenrisIndexerUrl } from './constants'
import { getWorldPackageId, getWorldType } from './mvr/worldTypes'

// GraphQL JSON of the Move events read below (world-contracts)
interface CharacterCreatedJson {
  character_id: string
  character_address: string
}
interface MetadataChangedJson {
  entity_id: string
  name: string
}

/** Pages in every event of a type, oldest first. */
async function fetchAllEvents(eventType: string): Promise<EventNode[]> {
  const events: EventNode[] = []
  let after: string | undefined
  do {
    const response = await getEventsByType(eventType, after ? { after } : {})
    if (response.errors?.length) {
      throw new Error(response.errors.map((e) => e.message).join('; '))
    }
    const page = response.data?.events
    if (!page) break
    events.push(...page.nodes)
    after = page.pageInfo.hasNextPage
      ? (page.pageInfo.endCursor ?? undefined)
      : undefined
  } while (after)
  return events
}

/**
 * Builds the list of every character from world events: `CharacterCreated`
 * gives the character's wallet, and the latest `MetadataChanged`
 * for that character gives its name. There is no on-chain name index, so the
 * whole list is fetched and searched client-side.
 *
 * @category Utilities - Characters
 * @param tenant - Tenant whose tier to use when VITE_EVE_WORLD_TIER is unset
 * @returns Every character, in creation order
 * @throws If a GraphQL response has errors
 */
export async function fetchCharacterDirectory(
  tenant?: string,
): Promise<CharacterSummary[]> {
  // TODO(wallet-core): use getWorldType once MetadataChanged is in WORLD_TYPE_KEYS
  const metadataChangedType = `${getWorldPackageId('metadata', tenant)}::metadata::MetadataChanged`
  const [created, renamed] = await Promise.all([
    fetchAllEvents(
      getWorldType('character::identity::CharacterCreated', tenant),
    ),
    fetchAllEvents(metadataChangedType),
  ])

  const names = new Map<string, string>()
  for (const event of renamed) {
    const json = event.contents?.json as MetadataChangedJson | undefined
    if (json) names.set(json.entity_id, json.name)
  }

  const characters: CharacterSummary[] = []
  for (const event of created) {
    const json = event.contents?.json as CharacterCreatedJson | undefined
    if (!json) continue
    characters.push({
      characterId: json.character_id,
      name: names.get(json.character_id) ?? '',
      walletAddress: json.character_address,
    })
  }
  return characters
}

const SEARCH_INDEXED_CHARACTERS = `
  query SearchCharacters($search: String!, $tenantId: String, $limit: Int) {
    characters(search: $search, tenantId: $tenantId, limit: $limit) {
      displayName
      characterId
      characterAddress
    }
  }
`

interface IndexedCharacter {
  displayName: string | null
  characterId: string
  characterAddress: string
}

/**
 * Searches characters by name on the Fenris private indexer
 * ({@link getFenrisIndexerUrl}), which matches anywhere in the name,
 * case-insensitively. Like {@link searchCharacters}, a query starting with
 * `0x` matches nothing.
 *
 * @category Utilities - Characters
 * @param query - Search text
 * @param options.tenant - Only characters of this tenant; all tenants if unset
 * @param options.limit - Maximum number of results. Default 20.
 * @param options.signal - Aborts the request
 * @returns Matching characters, in the indexer's order
 * @throws If the request fails or the response has errors
 */
export async function searchIndexedCharacters(
  query: string,
  options: {
    tenant?: string | undefined
    limit?: number | undefined
    signal?: AbortSignal | undefined
  } = {},
): Promise<CharacterSummary[]> {
  const search = query.trim()
  if (!search || search.toLowerCase().startsWith('0x')) return []

  const response = await fetch(getFenrisIndexerUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: SEARCH_INDEXED_CHARACTERS,
      variables: {
        search,
        tenantId: options.tenant || null,
        limit: options.limit ?? 20,
      },
    }),
    signal: options.signal ?? null,
  })
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }
  const body = (await response.json()) as GraphQLResponse<{
    characters: IndexedCharacter[] | null
  }>
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join('; '))
  }
  return (body.data?.characters ?? []).map((character) => ({
    characterId: character.characterId,
    name: character.displayName ?? '',
    walletAddress: character.characterAddress,
  }))
}

/**
 * Searches characters by name, case-insensitively, with prefix matches first.
 * A query starting with `0x` matches nothing: an address is not searched, it
 * is entered in full.
 *
 * @category Utilities - Characters
 * @param characters - From {@link fetchCharacterDirectory}
 * @param query - Search text
 * @param limit - Maximum number of results
 * @returns Matching characters
 */
export function searchCharacters(
  characters: CharacterSummary[],
  query: string,
  limit = 20,
): CharacterSummary[] {
  const needle = query.trim().toLowerCase()
  if (!needle || needle.startsWith('0x')) return []

  const prefix: CharacterSummary[] = []
  const contains: CharacterSummary[] = []
  for (const character of characters) {
    const index = character.name.toLowerCase().indexOf(needle)
    if (index === 0) prefix.push(character)
    else if (index > 0) contains.push(character)
  }
  return [...prefix, ...contains].slice(0, limit)
}
