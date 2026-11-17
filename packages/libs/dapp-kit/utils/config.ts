import { getSingletonConfigObjectByType } from '../graphql/client'
import type { ConfigExtractDynamicFieldNode } from '../graphql/types'
import { getEnergyConfigType, getFuelEfficiencyConfigType } from './constants'

/**
 * Fetches a config singleton's table once and caches the parsed map of
 * type_id -> value. Concurrent callers share one in-flight fetch.
 */
function createCachedConfig(getObjectType: () => string, tableName: string) {
  let cache: Record<number, number> | null = null
  let inFlight: Promise<Record<number, number>> | null = null

  return {
    async get(): Promise<Record<number, number>> {
      if (cache) {
        return cache
      }
      if (inFlight) {
        return inFlight
      }

      inFlight = (async () => {
        const nodes = await fetchAllConfigDynamicFieldNodes(
          getObjectType(),
          tableName,
        )

        cache = parseConfig(nodes)
        return cache
      })()

      try {
        return await inFlight
      } finally {
        inFlight = null
      }
    },
    reset(): void {
      cache = null
      inFlight = null
    },
  }
}

/** EnergyConfig singleton: type_id -> energy usage (e.g. energy_constant). */
const energyConfig = createCachedConfig(getEnergyConfigType, 'assembly_energy')
/** FuelEfficiencyConfig singleton: type_id -> fuel efficiency. */
const fuelEfficiencyConfig = createCachedConfig(
  getFuelEfficiencyConfigType,
  'fuel_efficiency',
)

/**
 * Resets in-memory and in-flight caches. Only for use in tests.
 * @internal
 */
export function resetConfigCachesForTesting(): void {
  energyConfig.reset()
  fuelEfficiencyConfig.reset()
}

/**
 * Parses EnergyConfig or FuelConfig object JSON (contents + dynamic fields) into a map of typeId -> value (e.g. energy_constant or fuel_efficiency).
 * Supports:
 * - Dynamic fields where name is type_id (string/number) and contents.json has value
 * - contents.json with a table/map of type_id -> value
 */
function parseConfig(
  nodes: ConfigExtractDynamicFieldNode[] | undefined,
): Record<number, number> {
  const byTypeId: Record<number, number> = {}
  if (!Array.isArray(nodes) || !nodes.length) return byTypeId
  for (const node of nodes) {
    const typeId = parseInt(node.key?.json ?? '', 10)
    if (Number.isNaN(typeId)) continue
    const energy = parseInt(node.value?.json ?? '', 10)
    byTypeId[typeId] = Number.isNaN(energy) ? 0 : energy
  }
  return byTypeId
}

/**
 * Fetches every dynamic field entry of an on-chain config table, following
 * cursor-based pagination until all pages have been retrieved. These tables
 * grow as new type_ids are added, so a single page is not guaranteed to
 * cover the full set.
 *
 * TODO: this loop is sequential (one request per page, awaited in order).
 * Fine while these tables stay in the tens-to-low-hundreds of entries and
 * results are cached after the first fetch, but if a table grows large
 * this will issue many serial round-trips and could run long. Revisit
 * with parallel fetch (if the API ever supports a total count or stable
 * cursor-range fetch) if that happens.
 *
 * Bounded by MAX_CONFIG_PAGES and a cursor-advance check as a backstop
 * against a misbehaving backend (e.g. hasNextPage: true paired with a
 * missing/unchanged endCursor).
 */
const MAX_CONFIG_PAGES = 200

async function fetchAllConfigDynamicFieldNodes(
  objectType: string,
  tableName: string,
): Promise<ConfigExtractDynamicFieldNode[]> {
  const nodes: ConfigExtractDynamicFieldNode[] = []
  let cursor: string | undefined
  let page = 0

  do {
    const result = await getSingletonConfigObjectByType(
      objectType,
      tableName,
      cursor ? { after: cursor } : undefined,
    )

    const dynamicFields =
      result.data?.objects?.nodes[0]?.asMoveObject?.contents?.extract?.extract
        ?.asAddress?.addressAt?.dynamicFields

    nodes.push(...(dynamicFields?.nodes ?? []))
    page += 1

    const nextCursor =
      (dynamicFields?.pageInfo?.hasNextPage
        ? dynamicFields?.pageInfo?.endCursor
        : undefined) ?? undefined

    if (nextCursor && nextCursor === cursor) {
      throw new Error(
        `Config pagination cursor did not advance for ${objectType} (${tableName}); aborting to avoid an infinite loop.`,
      )
    }
    cursor = nextCursor

    if (cursor && page >= MAX_CONFIG_PAGES) {
      throw new Error(
        `Config pagination for ${objectType} (${tableName}) exceeded ${MAX_CONFIG_PAGES} pages; aborting.`,
      )
    }
  } while (cursor)

  return nodes
}

/**
 * Fetches the EnergyConfig singleton via GraphQL (using getEnergyConfigType), parses it,
 * caches the result, and returns the map of type_id -> energy usage.
 * Subsequent calls return the cached map.
 *
 * @category Utilities - Config
 */
export function getEnergyConfig(): Promise<Record<number, number>> {
  return energyConfig.get()
}

/**
 * Fetches the Fuel Efficiency Config singleton via GraphQL (using getFuelEfficiencyConfigType), parses it,
 * caches the result, and returns the map of type_id -> fuel efficiency.
 * Subsequent calls return the cached map.
 *
 * @category Utilities - Config
 */
export function getFuelEfficiencyConfig(): Promise<Record<number, number>> {
  return fuelEfficiencyConfig.get()
}

/**
 * Returns the energy usage for a given assembly type ID from the on-chain EnergyConfig.
 * Uses cached EnergyConfig data after the first fetch.
 *
 * @param typeId - In-game type ID (e.g. from rawData.type_id)
 * @returns Energy usage (e.g. energy_constant), or 0 if not found or not yet loaded
 * @category Utilities - Config
 */
export async function getEnergyUsageForType(typeId: number): Promise<number> {
  const config = await getEnergyConfig()

  return config[typeId] ?? 0
}

/**
 * Returns the fuel efficiency for a given assembly type ID from the on-chain Fuel Efficiency Config.
 * Uses cached Fuel Efficiency Config data after the first fetch.
 *
 * @param typeId - In-game type ID (e.g. from rawData.type_id)
 * @returns Fuel efficiency (e.g. fuel_efficiency), or 0 if not found or not yet loaded
 * @category Utilities - Config
 */
export async function getFuelEfficiencyForType(
  typeId: number,
): Promise<number> {
  const config = await getFuelEfficiencyConfig()
  return config[typeId] ?? 0
}
