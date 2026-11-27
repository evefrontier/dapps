import { normalizeSuiAddress } from '@mysten/sui/utils'
import type { WorldPackage } from '../constants'
import { getWorldPackageId } from '../mvr/worldTypes'
import type { EventTypeMatcher, StreamEvent } from './graphqlEventStream'

/**
 * The world v1 events that change an entity's inventories or power grid, as
 * `module::Struct` by world package. Each carries the entity's `entity_id`
 * (`InventoryMigrated` carries `from_entity_id` and `to_entity_id`).
 *
 * @category Utilities - Events
 */
export const ENTITY_EVENT_NAMES = {
  inventory: [
    'item::ItemMinted',
    'item::ItemBurned',
    'item::ItemDeposited',
    'item::ItemWithdrawn',
    'item::ItemsDestroyed',
    'item::ItemsWithdrawn',
    'item::ItemsDeposited',
    'inventory::InventoryInstalled',
    'inventory::InventoryUninstalled',
    'inventory::FuelItemDeposited',
    'inventory::InventoryMigrated',
  ],
  power: [
    'power_grid::PowerToggled',
    'power_grid::DrawChanged',
    'grid_fuel::FuelAdded',
    'grid_fuel::FuelWithdrawn',
    'grid_fuel::FuelSiphoned',
    'grid_fuel::FuelBayToggled',
    'grid_generator::GeneratorToggled',
    'grid_load::DesiredStateChanged',
  ],
} as const satisfies Partial<Record<WorldPackage, readonly string[]>>

type EventPackage = keyof typeof ENTITY_EVENT_NAMES

/**
 * The full event types to subscribe to: each name under its world package's
 * id for the tenant's tier. The subscription opens one stream per package.
 *
 * Events are typed by the package version that defined them. An event added
 * in a later upgrade of a package carries that version's id, which the
 * per-package filter does not match; the polling backstop still catches the
 * change.
 *
 * @param tenant - Tenant whose tier to resolve against
 * @param packageId - Resolves a world package's id; `getWorldPackageId` by default
 * @category Utilities - Events
 */
export function entityEventTypes(
  tenant?: string,
  packageId: (pkg: EventPackage, tenant?: string) => string = getWorldPackageId,
): string[] {
  return (Object.keys(ENTITY_EVENT_NAMES) as EventPackage[]).flatMap((pkg) => {
    const id = packageId(pkg, tenant)
    return ENTITY_EVENT_NAMES[pkg].map((name) => `${id}::${name}`)
  })
}

/** `::module::Struct` of a type, without its package or type arguments. */
function typeSuffix(type: string): string {
  const base = type.split('<')[0] ?? type
  const start = base.indexOf('::')
  return start === -1 ? base : base.slice(start)
}

/**
 * Match delivered types by `::module::Struct`, whatever the package id. The
 * server already filters by package, so this only widens matching to a type
 * from an upgraded version that the filter let through.
 *
 * @category Utilities - Events
 */
export function entityEventMatcher(
  eventTypes: readonly string[],
): EventTypeMatcher {
  const suffixes = new Set(eventTypes.map(typeSuffix))
  return (type) => suffixes.has(typeSuffix(type))
}

const sameId = (a: unknown, b: string): boolean => {
  if (typeof a !== 'string' || a === '') return false
  try {
    return normalizeSuiAddress(a) === normalizeSuiAddress(b)
  } catch {
    return false
  }
}

/**
 * Whether an event is about the entity `entityId`: its `entity_id`, or either
 * side of an `InventoryMigrated`.
 *
 * @category Utilities - Events
 */
export function isEventForEntity(
  event: StreamEvent,
  entityId: string,
): boolean {
  const json = event.parsedJson
  if (typeof json !== 'object' || json === null) return false
  const fields = json as Record<string, unknown>
  return (
    sameId(fields['entity_id'], entityId) ||
    sameId(fields['from_entity_id'], entityId) ||
    sameId(fields['to_entity_id'], entityId)
  )
}
