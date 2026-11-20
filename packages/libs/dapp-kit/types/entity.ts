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
 * How a module takes power: `Firm` modules all get their full requirement or
 * none do; `Elastic` modules share what is left, in connect order.
 *
 * @category Types
 */
export type EntityDrawKind = 'Firm' | 'Elastic'

/** @category Types */
export interface EntityPowerModule {
  desiredOnline: boolean
  activeDraw: string
  powerReq: string
  drawKind: EntityDrawKind
}

/** @category Types */
export interface EntityGenerator {
  online: boolean
  maxOutputMw: string
  /** Fixed point at 10^4; divides the fuel's containment burden */
  containmentReduction: string
  /** Fuel per second, at 10^4, burned while the grid has no fuel impulse */
  baseFuelRate: string
}

/**
 * Power grid component. Fuel values are as of `lastSettledMs`; they only
 * update on the next transaction that touches the grid.
 *
 * @category Types
 */
export interface EntityPowerGrid {
  on: boolean
  fuelQuantity: string
  fuelCapacity: string
  capacityMw: string
  lastSettledMs: string
  /** Pooled fuel impulse, at 10^4; 0 means generators burn their base rate */
  fuelImpulse: string
  /** Pooled fuel containment burden, at 10^4 */
  fuelContainmentBurden: string
  /** Keyed by module component id, in connect order */
  modules: Record<string, EntityPowerModule>
  /** Keyed by generator component id */
  generators: Record<string, EntityGenerator>
  /** Fuel source component id → capacity */
  fuelSources: Record<string, string>
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
