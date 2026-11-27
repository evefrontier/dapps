/**
 * Parsed world entity (world-contracts `core::entity::Entity` plus its
 * components). u64 and fixed-point values stay as decimal strings, as in the
 * GraphQL JSON, so no precision is lost.
 */

/** @category Types */
export interface EntityMetadata {
  name: string
  description: string
  url: string
}

/** Character identity component. @category Types */
export interface EntityIdentity {
  tribeId: number
  /** Wallet address bound to the character */
  owner: string
}

/**
 * A number as the decimal string GraphQL returns, so no precision is lost. On a
 * `fuelFactor` grid power and fuel are fixed point at 10^4 (`150000` is 15 MW);
 * on a `pools` grid power is plain MW and fuel is fixed point at 10^9 (1e-9 kg).
 * See {@link PowerGridModel}.
 *
 * @category Types
 */
export type FixedPoint = string

/**
 * Which world-contracts power maths a grid's values follow:
 * - `fuelFactor`: up to dev-v1.1.11. One fuel pool (`fuel_*`, `fuel_sources`),
 *   burn through `fuel_factor` (impulse over containment burden), power and fuel
 *   at 10^4.
 * - `pools`: dev-v1.1.16 onward. Fuel bays pooled by fuel type, each Generator
 *   burning its own type at `usable_impulse` with output scaled by volatility,
 *   power in plain MW, fuel at 10^9 (1e-9 kg).
 *
 * dev-v1.1.12 to v1.1.15 store the `pools` layout at 10^4; the layout alone
 * cannot tell them apart, so they read as `pools` and are not supported.
 *
 * @category Types
 */
export type PowerGridModel = 'fuelFactor' | 'pools'

/** A quantity of one fuel type and its stats, on a `pools` grid. @category Types */
export interface EntityFuel {
  /** Null while empty */
  fuelType: string | null
  quantity: FixedPoint
  impulse: FixedPoint
  /** Stored only; burn ignores it */
  containmentBurden: FixedPoint
  volatility: FixedPoint
}

/** A fuel bay on a `pools` grid. Fuel as of the grid's `lastSettledMs`. @category Types */
export interface EntityFuelBay {
  capacity: FixedPoint
  /** Only online bays feed the grid */
  online: boolean
  fuel: EntityFuel
}

/**
 * How a module takes power: `Firm` modules all get their full requirement or
 * none do; `Elastic` modules share what is left, in connect order.
 *
 * @category Types
 */
export type EntityDrawKind = 'Firm' | 'Elastic'

/** @category Types */
export interface EntityPowerModule {
  desiredOnline: boolean
  activeDraw: FixedPoint
  powerReq: FixedPoint
  drawKind: EntityDrawKind
  /** Stored on chain; the v1 grant rules ignore it */
  priority: string
  /** Stored on chain; the v1 grant rules ignore it */
  lineLoss: FixedPoint
}

/** @category Types */
export interface EntityGenerator {
  online: boolean
  maxOutputMw: FixedPoint
  /** Divides the fuel's containment burden */
  containmentReduction: FixedPoint
  /** Fuel per second burned while the grid has no fuel impulse */
  baseFuelRate: FixedPoint
  /** `pools` grids only: the one fuel type it burns */
  fuelType?: string
  /** `pools` grids only: most impulse it can use, at 10^9 */
  impulseLimit?: FixedPoint
  /** `pools` grids only: volatility that gives full rated output, at 10^9 */
  volatilityLimit?: FixedPoint
}

/**
 * Power grid component. Fuel values are as of `lastSettledMs`; they only
 * update on the next transaction that touches the grid.
 *
 * @category Types
 */
export interface EntityPowerGrid {
  /** Which contract maths the values follow; `fuelFactor` when unset */
  model?: PowerGridModel
  /** Power On/Off as of the last settle (`on_at_last_settled` on a `pools` grid) */
  on: boolean
  /** In online bays on a `pools` grid */
  fuelQuantity: FixedPoint
  /** Of online bays on a `pools` grid */
  fuelCapacity: FixedPoint
  /** Generators' output as of the last settle (`capacity_mw`) */
  capacityMw: FixedPoint
  lastSettledMs: string
  /** Pooled fuel impulse; 0 means generators burn their base rate */
  fuelImpulse: FixedPoint
  /** Pooled fuel containment burden */
  fuelContainmentBurden: FixedPoint
  /** Keyed by module component id, in connect order */
  modules: Record<string, EntityPowerModule>
  /** Keyed by generator component id */
  generators: Record<string, EntityGenerator>
  /** Fuel source (fuel bay) component id → capacity */
  fuelSources: Record<string, FixedPoint>
  /** `pools` grids only: fuel bays by component id, in install order */
  bays?: Record<string, EntityFuelBay>
}

/** @category Types */
export interface EntityLayoutSection {
  id: string
  /** Component ids installed in this section */
  moduleIds: string[]
}

/** @category Types */
export interface EntityLayout {
  /** Shell object id; null when the creation has no shell (dark) */
  shellId: string | null
  sections: EntityLayoutSection[]
}

/** @category Types */
export interface EntityInventoryItem {
  typeId: string
  quantity: string
  /** Volume per unit */
  volume: string
}

/** @category Types */
export interface EntityInventory {
  componentId: string
  name: string | null
  /** Kind of inventory, not an item type */
  typeId: string
  capacity: string
  used: string
  items: EntityInventoryItem[]
}

/** @category Types */
export interface EntityGenericModule {
  componentId: string
  name: string | null
  typeId: string
}

/** Any installed component, unparsed. @category Types */
export interface EntityComponent {
  id: string
  name: string | null
  /** Inner type as `module::Struct`, e.g. `power_grid::PowerGrid` */
  kind: string
  /** Full Move type of the component value */
  type: string
  json: unknown
}

/** One requirement an action checks before it runs. @category Types */
export interface EntityActionRequirement {
  /** Move type of the requirement, e.g. `<package>::power_grid::OperateGrid` */
  typeName: string
  /** Component the requirement is checked against */
  componentId: string
}

/** An action registered on the entity, with what it requires. @category Types */
export interface EntityAction {
  name: string
  /** Which action map it is in: admin or owner */
  scope: 'admin' | 'owner'
  requirements: EntityActionRequirement[]
}

/** @category Types */
export interface EntityData {
  id: string
  /** Latest object version, used to detect changes between polls */
  version: number
  key: { id: string; tenant: string }
  accessCapId: string | null
  /** True while the entity is locked by an in-flight request */
  inFlight: boolean
  metadata: EntityMetadata | null
  identity: EntityIdentity | null
  powerGrid: EntityPowerGrid | null
  layout: EntityLayout | null
  inventories: EntityInventory[]
  genericModules: EntityGenericModule[]
  /** Character ids allowed to control the entity; null when it has no access list */
  controllers: string[] | null
  /** Every installed component, including the parsed ones */
  components: EntityComponent[]
  /** Names of admin actions */
  adminActions: string[]
  /** Names of owner actions */
  ownerActions: string[]
  /** Every admin and owner action with its requirements */
  actions: EntityAction[]
}

/**
 * Who controls an entity, resolved from the holder of its AccessCap.
 *
 * @category Types
 */
export interface EntityOwner {
  /**
   * - `wallet`: the cap is held by an address with no object at it
   * - `character`: the cap is parked on an Entity; `walletAddress` is null if
   *   it has no Identity
   * - `object`: held by some other object, e.g. an `ObjectOwner` dynamic-field
   *   wrapper; no wallet is resolved
   * - `none`: the cap is not address-owned (shared, immutable) or not found
   */
  kind: 'wallet' | 'character' | 'object' | 'none'
  /** Address holding the AccessCap: a wallet, or a Character entity's id */
  holder: string | null
  /** The holder wallet, or the Character's Identity.owner */
  walletAddress: string | null
  /** The Character entity when the cap is parked on one */
  character: EntityData | null
}

/**
 * A character as listed by world events, for search.
 *
 * @category Types
 */
export interface CharacterSummary {
  characterId: string
  /** Latest metadata name; empty when the character has never been named */
  name: string
  /** Wallet address bound to the character */
  walletAddress: string
}
