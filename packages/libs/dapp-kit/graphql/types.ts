/**
 * GraphQL response types for Sui object queries
 */

// ============================================================================
// Base GraphQL Types
// ============================================================================

/** Response wrapper for GraphQL with optional `data` and `errors`. @category GraphQL Types */
export interface GraphQLResponse<T = unknown> {
  data?: T
  errors?: Array<{ message: string }>
}

/** Pagination cursor and has-next flag. @category GraphQL Types */
export interface PageInfo {
  hasNextPage: boolean
  endCursor: string | null
}

// ============================================================================
// Shared building blocks (reused across response types)
// ============================================================================

/** @category GraphQL Types */
export interface TypeRepr {
  repr: string
}

/** @category GraphQL Types */
export interface TypeReprWithLayout extends TypeRepr {
  layout?: string
}

/** @category GraphQL Types */
export interface ContentsBcs {
  bcs: string
}

/** @category GraphQL Types */
export interface ContentsTypeAndBcs extends ContentsBcs {
  type: TypeRepr
}

/** @category GraphQL Types */
export interface ContentsJsonAndBcs extends ContentsBcs {
  json: Record<string, unknown>
}

/** @category GraphQL Types */
export interface ContentsTypeJsonAndBcs extends ContentsJsonAndBcs {
  type: TypeRepr
}

/** Contents with type + json only (no bcs). Reuses ContentsTypeJsonAndBcs shape.
 *  @category GraphQL Types
 */
export type ContentsTypeAndJson = Pick<ContentsTypeJsonAndBcs, 'type' | 'json'>

/** Node shape: contents.extract.asAddress.asObject.asMoveObject.contents.
 *  Reusable for any extract-path node whose inner contents are typed as T.
 *  @category GraphQL Types
 */
export interface ExtractAsMoveObjectNode<T = ContentsTypeAndJson> {
  contents: {
    extract: {
      asAddress: {
        asObject: {
          asMoveObject: {
            contents: T
          }
        }
      }
    }
  }
}

/** @category GraphQL Types */
export interface PreviousTransaction {
  effects?: { timestamp?: string }
}

/** @category GraphQL Types */
export interface ObjectNodes<T> {
  nodes: T[]
}

/** @category GraphQL Types */
export interface AddressWithObjects<T> {
  address: string
  objects: ObjectNodes<T>
}

/** GraphQL asAddress → asObject → asMoveObject ref chain.
 *  @category GraphQL Types
 */
export interface AsMoveObjectRef<T> {
  asAddress?: {
    asObject?: {
      asMoveObject?: T
    }
  }
}

/** Contents with only json (optional payload).
 *  @category GraphQL Types
 */
export interface ContentsJsonOnly {
  json: Record<string, unknown>
}

/** Move object ref whose contents have json of type T.
 *  @category GraphQL Types
 */
export type MoveObjectRefWithJson<T> = AsMoveObjectRef<{
  contents: { json: T }
}>

// ============================================================================
// Move Object Types
// ============================================================================

/** @category GraphQL Types */
export interface MoveObjectContents {
  json?: Record<string, unknown>
  bcs?: string
  type?: TypeReprWithLayout
}

/** @category GraphQL Types */
export interface DynamicFieldNode {
  contents: {
    json: Record<string, unknown>
    type: { layout: string }
  }
  name: {
    json: unknown
    type: TypeRepr
  }
}

/** @category GraphQL Types */
export interface MoveObjectData {
  contents: MoveObjectContents
  dynamicFields?: ObjectNodes<DynamicFieldNode>
}

// ============================================================================
// Object Response Types
// ============================================================================

/** @category GraphQL Types */
export interface SuiObjectResponse {
  address?: string
  version?: number
  digest?: string
  asMoveObject: MoveObjectData | null
}

/** @category GraphQL Types */
export interface GetObjectResponse {
  object?: SuiObjectResponse
}

/** @category GraphQL Types */
export interface GetObjectByAddressResponse {
  object?: {
    address: string
    version: number
    digest: string
    asMoveObject: { contents: ContentsTypeAndBcs } | null
  }
}

// ============================================================================
// Owner & Owned Objects Response Types
// ============================================================================

/** @category GraphQL Types */
export interface OwnedObjectNode {
  contents: ContentsBcs
  previousTransaction?: PreviousTransaction
}

/** @category GraphQL Types */
export interface AddressOwner {
  address: AddressWithObjects<OwnedObjectNode>
}

/** @category GraphQL Types */
export interface GetObjectOwnerAndOwnedObjectsResponse {
  object?: { owner?: { address?: AddressOwner['address'] } }
}

/** @category GraphQL Types */
export interface OwnedObjectNodeWithJson {
  address: string
  contents: ContentsJsonAndBcs
  previousTransaction?: PreviousTransaction
}

/** @category GraphQL Types */
export interface AddressOwnerWithJson {
  address: AddressWithObjects<OwnedObjectNodeWithJson>
}

/** @category GraphQL Types */
export interface GetObjectOwnerAndOwnedObjectsWithJsonResponse {
  object?: { owner?: { address?: AddressOwnerWithJson['address'] } }
}

/** Node shape for owner's objects in GetObjectAndCharacterOwner (authorizedObj → character).
 *  @category GraphQL Types
 */
export interface CharacterOwnerNode {
  contents: {
    authorizedObj: MoveObjectRefWithJson<RawCharacterData>
  }
}

/**
 * @category GraphQL Types
 * @deprecated Relies on the archived world `OwnerCap`/`owner_cap_id`, `energy_source_id` and `linked_gate_id` fields. Read the entity with `getEntity` and resolve ownership through its `AccessCap`.
 */
export interface GetObjectAndCharacterOwnerResponse {
  object: {
    asMoveObject: {
      contents: ContentsTypeJsonAndBcs & {
        extract?: AsMoveObjectRef<{
          owner: { address: AddressWithObjects<CharacterOwnerNode> }
          contents?: ContentsJsonOnly
        }> | null
        energySource?: AsMoveObjectRef<{ contents?: ContentsJsonOnly }>
        destinationGate?: AsMoveObjectRef<{ contents?: ContentsJsonOnly }>
      }
      dynamicFields?: ObjectNodes<DynamicFieldNode>
    }
  }
}

/** @category GraphQL Types */
export interface GetObjectWithJsonResponse {
  object?: {
    address: string
    version: number
    digest: string
    asMoveObject: { contents: ContentsTypeJsonAndBcs } | null
  }
}

// ============================================================================
// GetOwnedObjectsByType Response Types
// ============================================================================

/** @category GraphQL Types */
export interface OwnedObjectAddressNode {
  address: string
}

/** @category GraphQL Types */
export interface GetOwnedObjectsByTypeResponse {
  address?: { objects: ObjectNodes<OwnedObjectAddressNode> }
}

// ============================================================================
// GetOwnedObjectsByPackage Response Types
// ============================================================================

/** @category GraphQL Types */
export interface OwnedObjectFullNode {
  address: string
  version: number
  asMoveObject: MoveObjectData | null
}

/** @category GraphQL Types */
export interface GetOwnedObjectsByPackageResponse {
  objects: ObjectNodes<OwnedObjectFullNode>
}

/**
 * @category GraphQL Types
 * @deprecated Relies on the archived world `PlayerProfile.character_id`. A character is now an `Entity` with a `Component<Identity>`, whose ID is derived from its in-game ID and tenant.
 */
export interface GetWalletCharactersResponse {
  address: AddressWithObjects<ExtractAsMoveObjectNode>
}

/** @category GraphQL Types */
export interface CharacterAndOwnedObjectsNode {
  contents: {
    extract: {
      asAddress: {
        asObject?: {
          asMoveObject?: {
            contents: ContentsTypeAndJson
          }
        }
        objects: ObjectNodes<ExtractAsMoveObjectNode>
      }
    }
  }
}

/**
 * @category GraphQL Types
 * @deprecated Relies on the archived world `PlayerProfile.character_id`. A character is now an `Entity` with a `Component<Identity>`, whose ID is derived from its in-game ID and tenant.
 */
export interface GetCharacterAndOwnedObjectsResponse {
  address: AddressWithObjects<CharacterAndOwnedObjectsNode>
}

// ============================================================================
// Singleton & Type-based Query Response Types
// ============================================================================

/** @category GraphQL Types */
export interface GetSingletonObjectByTypeResponse {
  objects: ObjectNodes<OwnedObjectAddressNode>
}

/** @category GraphQL Types */
export interface ConfigExtractDynamicFieldNode {
  key: { json: string }
  value: { json: string }
}

/**
 * @category GraphQL Types
 * @deprecated Relies on the archived world `EnergyConfig`/`FuelConfig` singleton tables. Fuel and energy now live per creation in the `PowerGrid` component.
 */
export interface GetSingletonConfigObjectByTypeResponse {
  objects: {
    nodes: Array<{
      address: string
      asMoveObject: {
        contents: {
          extract: {
            extract: {
              asAddress: {
                addressAt: {
                  dynamicFields: {
                    pageInfo: PageInfo
                    nodes: ConfigExtractDynamicFieldNode[]
                  }
                }
              }
            }
          }
        }
      }
    }>
  }
}

/** @category GraphQL Types */
export interface ObjectWithContentsNode {
  address: string
  version: number
  asMoveObject: {
    contents: { json: Record<string, unknown>; type: TypeRepr }
  } | null
}

/** @category GraphQL Types */
export interface GetObjectsByTypeResponse {
  objects: ObjectNodes<ObjectWithContentsNode> & { pageInfo: PageInfo }
}

// ============================================================================
// Table Entry Types
// ============================================================================

/** Entry of a table nested inside a dynamic field value.
 *  @category GraphQL Types
 */
export interface DynamicFieldTableEntryNode {
  name: ContentsTypeAndJson
  value: ContentsTypeAndJson | null
}

// ============================================================================
// Entity Query Response Types
// ============================================================================

/** A page of table entries. @category GraphQL Types */
export type TableEntriesPage = ObjectNodes<DynamicFieldTableEntryNode> & {
  pageInfo: PageInfo
}

/** Table resolved from an `extract` path; null when the value has no such path.
 *  @category GraphQL Types
 */
export type NestedTableRef = {
  asAddress: { addressAt: { dynamicFields: TableEntriesPage } | null } | null
} | null

/** Entity dynamic field: a component or action map, with inline tables.
 *  @category GraphQL Types
 */
export interface EntityDynamicFieldNode {
  contents: {
    name: ContentsTypeAndJson
    value: ContentsTypeAndJson & {
      sections: NestedTableRef
      items: NestedTableRef
    }
  }
}

/** @category GraphQL Types */
export interface GetEntityResponse {
  latestVersion: ObjectNodes<{ version: number }>
  object: {
    asMoveObject: { contents: ContentsTypeAndJson } | null
    dynamicFields: ObjectNodes<EntityDynamicFieldNode> & { pageInfo: PageInfo }
  } | null
}

/** @category GraphQL Types */
export interface GetTableEntriesResponse {
  address: { dynamicFields: TableEntriesPage } | null
}

/** @category GraphQL Types */
export interface GetObjectLatestVersionResponse {
  latestVersion: ObjectNodes<{ version: number }>
}

/** @category GraphQL Types */
export interface GetObjectOwnerResponse {
  object: {
    owner:
      | {
          __typename: 'AddressOwner' | 'ObjectOwner'
          address: { address: string }
        }
      | { __typename: 'Shared' | 'Immutable' | 'ConsensusAddressOwner' }
      | null
  } | null
}

// ============================================================================
// EVE Frontier Specific Types
// ============================================================================

/**
 * Raw Sui object data structure returned from the EVE Frontier package
 *
 * @category GraphQL Types
 */
export interface RawSuiObjectData {
  id: string
  type_id: string
  extension: unknown
  inventory_keys?: string[]
  /**
   * Linked gate ID for Smart Gates
   * @deprecated `linked_gate_id` does not exist in the entity model.
   */
  linked_gate_id?: string
  /**
   * Energy source ID for linked assemblies of network nodes
   * @deprecated `energy_source_id` does not exist in the entity model; power lives in the `PowerGrid` component.
   */
  energy_source_id?: string
  key?: {
    item_id: string
    tenant: string
  }
  location?: {
    location_hash: string
    structure_id: string
  }
  metadata?: {
    assembly_id: string
    description: string
    name: string
    url: string
  }
  /** @deprecated `owner_cap_id` does not exist in the entity model; ownership is held by an `AccessCap`. */
  owner_cap_id?: string
  status?: {
    assembly_id?: string
    item_id?: string
    status: {
      '@variant': string
    }
    type_id?: string
  }
  /** Fuel data for Network Nodes */
  fuel?: {
    max_capacity: string
    burn_rate_in_ms: string
    type_id: string
    unit_volume: string
    quantity: string
    is_burning: boolean
    previous_cycle_elapsed_time: string
    burn_start_time: string
    last_updated: string
  }
  /** Energy source data for Network Nodes */
  energy_source?: {
    max_energy_production: string
    current_energy_production: string
    total_reserved_energy: string
  }
  /** Connected assembly IDs for Network Nodes */
  connected_assembly_ids?: string[]
}

/**
 * OwnerCap JSON structure - returned from Character OwnerCap query
 * Contains the authorized_object_id which is the Character ID
 *
 * @category GraphQL Types
 * @deprecated The archived world `OwnerCap` is replaced by `AccessCap { entity }`.
 */
export interface OwnerCapData {
  authorized_object_id: string
  id: string
}

/**
 * Raw Character data structure from the EVE Frontier package
 *
 * @category GraphQL Types
 */
export interface RawCharacterData {
  id: `0x${string}`
  key: {
    item_id: string
    tenant: string
  }
  tribe_id: number
  character_address: `0x${string}`
  metadata: {
    assembly_id: `0x${string}`
    name: string
    description: string
    url: string
  }
  owner_cap_id: `0x${string}`
  // Additional fields that may be present
  [key: string]: unknown
}

/**
 * Processed character/owner information
 *
 * @category GraphQL Types
 */
export interface CharacterInfo {
  id: string
  address: string
  name: string
  tribeId: number
  characterId: number
  _raw?: RawCharacterData
}
