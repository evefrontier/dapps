import { getSingletonConfigObjectByType } from '../graphql/client'
import type { ConfigExtractDynamicFieldNode } from '../graphql/types'
import { getEnergyConfigType, getFuelEfficiencyConfigType } from './constants'

/**
 * Cached energy config: type_id -> energy usage (e.g. energy_constant).
 * Populated from the on-chain EnergyConfig singleton.
 */
let energyConfigCache: Record<number, number> | null = null
let fuelEfficiencyConfigCache: Record<number, number> | null = null

/** In-flight promise for energy config so concurrent callers share one fetch. */
let energyConfigInFlight: Promise<Record<number, number>> | null = null
/** In-flight promise for fuel efficiency config so concurrent callers share one fetch. */
let fuelEfficiencyConfigInFlight: Promise<Record<number, number>> | null = null

/**
 * Resets in-memory and in-flight caches. Only for use in tests.
 * @internal
 */
export function resetConfigCachesForTesting(): void {
  energyConfigCache = null
  fuelEfficiencyConfigCache = null
  energyConfigInFlight = null
  fuelEfficiencyConfigInFlight = null
}

/**
 * Parses EnergyConfig or FuelConfig object JSON (contents + dynamic fields) into a map of typeId -> value (e.g. energy_constant or fuel_efficiency).
 * Supports:
 * - Dynamic fields where name is type_id (string/number) and contents.json has value
 * - contents.json with a table/map of type_id -> value
 */
function parseConfig(
  configJson: Record<string, unknown> | undefined,
): Record<number, number> {
  const byTypeId: Record<number, number> = {}
  const nodes = configJson as unknown as
    | Array<{ key: { json: string }; value: { json: string } }>
    | undefined
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
 * TODO: this loop is sequential (one request per page, awaited in order)
 * and unbounded (no max-page/max-node cap). Fine while these tables stay
 * in the tens-to-low-hundreds of entries and results are cached after the
 * first fetch, but if a table grows large this will issue many serial
 * round-trips and could run long. Revisit with a page cap and/or
 * parallel fetch (if the API ever supports a total count or stable
 * cursor-range fetch) if that happens.
 */
async function fetchAllConfigDynamicFieldNodes(
  objectType: string,
  tableName: string,
): Promise<ConfigExtractDynamicFieldNode[]> {
  const nodes: ConfigExtractDynamicFieldNode[] = []
  let cursor: string | undefined

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
    cursor =
      (dynamicFields?.pageInfo?.hasNextPage
        ? dynamicFields?.pageInfo?.endCursor
        : undefined) ?? undefined
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
export async function getEnergyConfig(): Promise<Record<number, number>> {
  if (energyConfigCache) {
    return energyConfigCache
  }
  if (energyConfigInFlight) {
    return energyConfigInFlight
  }

  energyConfigInFlight = (async () => {
    const nodes = await fetchAllConfigDynamicFieldNodes(
      getEnergyConfigType(),
      'assembly_energy',
    )

    energyConfigCache = parseConfig(nodes as unknown as Record<string, unknown>)
    return energyConfigCache
  })()

  try {
    return await energyConfigInFlight
  } finally {
    energyConfigInFlight = null
  }
}

/**
 * Fetches the Fuel Efficiency Config singleton via GraphQL (using getFuelEfficiencyConfigType), parses it,
 * caches the result, and returns the map of type_id -> fuel efficiency.
 * Subsequent calls return the cached map.
 *
 * @category Utilities - Config
 */
export async function getFuelEfficiencyConfig(): Promise<
  Record<number, number>
> {
  if (fuelEfficiencyConfigCache) {
    return fuelEfficiencyConfigCache
  }
  if (fuelEfficiencyConfigInFlight) {
    return fuelEfficiencyConfigInFlight
  }

  fuelEfficiencyConfigInFlight = (async () => {
    const nodes = await fetchAllConfigDynamicFieldNodes(
      getFuelEfficiencyConfigType(),
      'fuel_efficiency',
    )

    fuelEfficiencyConfigCache = parseConfig(
      nodes as unknown as Record<string, unknown>,
    )
    return fuelEfficiencyConfigCache
  })()

  try {
    return await fuelEfficiencyConfigInFlight
  } finally {
    fuelEfficiencyConfigInFlight = null
  }
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
