/**
 * GraphQL response types for Sui object queries
 */

// ============================================================================
// Base GraphQL Types
// ============================================================================

/** @category GraphQL */
export interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: Array<{ message: string }>;
}

/** @category GraphQL */
export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

// ============================================================================
// Shared building blocks (reused across response types)
// ============================================================================

/** @category GraphQL */
export interface TypeRepr {
  repr: string;
}

/** @category GraphQL */
export interface TypeReprWithLayout extends TypeRepr {
  layout?: string;
}

/** @category GraphQL */
export interface ContentsBcs {
  bcs: string;
}

/** @category GraphQL */
export interface ContentsTypeAndBcs extends ContentsBcs {
  type: TypeRepr;
}

/** @category GraphQL */
export interface ContentsJsonAndBcs extends ContentsBcs {
  json: Record<string, unknown>;
}

/** @category GraphQL */
export interface ContentsTypeJsonAndBcs extends ContentsJsonAndBcs {
  type: TypeRepr;
}

/** Contents with type + json only (no bcs). Reuses ContentsTypeJsonAndBcs shape.
 *  @category GraphQL
 */
export type ContentsTypeAndJson = Pick<ContentsTypeJsonAndBcs, "type" | "json">;

/** Node shape: contents.extract.asAddress.asObject.asMoveObject.contents.
 *  Reusable for any extract-path node whose inner contents are typed as T.
 *  @category GraphQL
 */
export interface ExtractAsMoveObjectNode<T = ContentsTypeAndJson> {
  contents: {
    extract: {
      asAddress: {
        asObject: {
          asMoveObject: {
            contents: T;
          };
        };
      };
    };
  };
}

/** @category GraphQL */
export interface PreviousTransaction {
  effects?: { timestamp?: string };
}

/** @category GraphQL */
export interface ObjectNodes<T> {
  nodes: T[];
}

/** @category GraphQL */
export interface AddressWithObjects<T> {
  address: string;
  objects: ObjectNodes<T>;
}

/** GraphQL asAddress → asObject → asMoveObject ref chain.
 *  @category GraphQL
 */
export interface AsMoveObjectRef<T> {
  asAddress?: {
    asObject?: {
      asMoveObject?: T;
    };
  };
}

/** Contents with only json (optional payload).
 *  @category GraphQL
 */
export interface ContentsJsonOnly {
  json: Record<string, unknown>;
}

/** Move object ref whose contents have json of type T.
 *  @category GraphQL
 */
export type MoveObjectRefWithJson<T> = AsMoveObjectRef<{
  contents: { json: T };
}>;

// ============================================================================
// Move Object Types
// ============================================================================

/** @category GraphQL */
export interface MoveObjectContents {
  json?: Record<string, unknown>;
  bcs?: string;
  type?: TypeReprWithLayout;
}

/** @category GraphQL */
export interface DynamicFieldNode {
  contents: {
    json: Record<string, unknown>;
    type: { layout: string };
  };
  name: {
    json: unknown;
    type: TypeRepr;
  };
}

/** @category GraphQL */
export interface MoveObjectData {
  contents: MoveObjectContents;
  dynamicFields?: ObjectNodes<DynamicFieldNode>;
}

// ============================================================================
// Object Response Types
// ============================================================================

/** @category GraphQL */
export interface SuiObjectResponse {
  address?: string;
  version?: number;
  digest?: string;
  asMoveObject: MoveObjectData | null;
}

/** @category GraphQL */
export interface GetObjectResponse {
  object?: SuiObjectResponse;
}

/** @category GraphQL */
export interface GetObjectByAddressResponse {
  object?: {
    address: string;
    version: number;
    digest: string;
    asMoveObject: { contents: ContentsTypeAndBcs } | null;
  };
}

// ============================================================================
// Owner & Owned Objects Response Types
// ============================================================================

/** @category GraphQL */
export interface OwnedObjectNode {
  contents: ContentsBcs;
  previousTransaction?: PreviousTransaction;
}

/** @category GraphQL */
export interface AddressOwner {
  address: AddressWithObjects<OwnedObjectNode>;
}

/** @category GraphQL */
export interface GetObjectOwnerAndOwnedObjectsResponse {
  object?: { owner?: { address?: AddressOwner["address"] } };
}

/** @category GraphQL */
export interface OwnedObjectNodeWithJson {
  address: string;
  contents: ContentsJsonAndBcs;
  previousTransaction?: PreviousTransaction;
}

/** @category GraphQL */
export interface AddressOwnerWithJson {
  address: AddressWithObjects<OwnedObjectNodeWithJson>;
}

/** @category GraphQL */
export interface GetObjectOwnerAndOwnedObjectsWithJsonResponse {
  object?: { owner?: { address?: AddressOwnerWithJson["address"] } };
}

/** Node shape for owner's objects in GetObjectAndCharacterOwner (authorizedObj → character).
 *  @category GraphQL
 */
export interface CharacterOwnerNode {
  contents: {
    authorizedObj: MoveObjectRefWithJson<RawCharacterData>;
  };
}

/** @category GraphQL */
export interface GetObjectAndCharacterOwnerResponse {
  object: {
    asMoveObject: {
      contents: ContentsTypeJsonAndBcs & {
        extract?: AsMoveObjectRef<{
          owner: { address: AddressWithObjects<CharacterOwnerNode> };
          contents?: ContentsJsonOnly;
        }> | null;
        energySource?: AsMoveObjectRef<{ contents?: ContentsJsonOnly }>;
        destinationGate?: AsMoveObjectRef<{ contents?: ContentsJsonOnly }>;
      };
      dynamicFields?: ObjectNodes<DynamicFieldNode>;
    };
  };
}

/** @category GraphQL */
export interface GetObjectWithJsonResponse {
  object?: {
    address: string;
    version: number;
    digest: string;
    asMoveObject: { contents: ContentsTypeJsonAndBcs } | null;
  };
}

// ============================================================================
// GetOwnedObjectsByType Response Types
// ============================================================================

/** @category GraphQL */
export interface OwnedObjectAddressNode {
  address: string;
}

/** @category GraphQL */
export interface GetOwnedObjectsByTypeResponse {
  address?: { objects: ObjectNodes<OwnedObjectAddressNode> };
}

// ============================================================================
// GetOwnedObjectsByPackage Response Types
// ============================================================================

/** @category GraphQL */
export interface OwnedObjectFullNode {
  address: string;
  version: number;
  asMoveObject: MoveObjectData | null;
}

/** @category GraphQL */
export interface GetOwnedObjectsByPackageResponse {
  objects: ObjectNodes<OwnedObjectFullNode>;
}

/** @category GraphQL */
export interface GetWalletCharactersResponse {
  address: AddressWithObjects<ExtractAsMoveObjectNode>;
}

/** @category GraphQL */
export interface CharacterAndOwnedObjectsNode {
  contents: {
    extract: {
      asAddress: {
        asObject?: {
          asMoveObject?: {
            contents: ContentsTypeAndJson;
          };
        };
        objects: ObjectNodes<ExtractAsMoveObjectNode>;
      };
    };
  };
}

/** @category GraphQL */
export interface GetCharacterAndOwnedObjectsResponse {
  address: AddressWithObjects<CharacterAndOwnedObjectsNode>;
}

// ============================================================================
// Singleton & Type-based Query Response Types
// ============================================================================

/** @category GraphQL */
export interface GetSingletonObjectByTypeResponse {
  objects: ObjectNodes<OwnedObjectAddressNode>;
}

/** @category GraphQL */
export interface ConfigExtractDynamicFieldNode {
  key: { json: string };
  value: { json: string };
}

/** @category GraphQL */
export interface GetSingletonConfigObjectByTypeResponse {
  objects: {
    nodes: Array<{
      address: string;
      asMoveObject: {
        contents: {
          extract: {
            extract: {
              asAddress: {
                addressAt: {
                  dynamicFields: {
                    pageInfo: PageInfo;
                    nodes: ConfigExtractDynamicFieldNode[];
                  };
                };
              };
            };
          };
        };
      };
    }>;
  };
}

/** @category GraphQL */
export interface ObjectWithContentsNode {
  address: string;
  version: number;
  asMoveObject: {
    contents: { json: Record<string, unknown>; type: TypeRepr };
  } | null;
}

/** @category GraphQL */
export interface GetObjectsByTypeResponse {
  objects: ObjectNodes<ObjectWithContentsNode> & { pageInfo: PageInfo };
}

// ============================================================================
// EVE Frontier Specific Types
// ============================================================================

/**
 * Raw Sui object data structure returned from the EVE Frontier package
 *
 * @category GraphQL
 */
export interface RawSuiObjectData {
  id: string;
  type_id: string;
  extension: unknown;
  inventory_keys?: string[];
  /** Linked gate ID for Smart Gates */
  linked_gate_id?: string;
  /** Energy source ID for linked assemblies of network nodes */
  energy_source_id?: string;
  key?: {
    item_id: string;
    tenant: string;
  };
  location?: {
    location_hash: string;
    structure_id: string;
  };
  metadata?: {
    assembly_id: string;
    description: string;
    name: string;
    url: string;
  };
  owner_cap_id?: string;
  status?: {
    assembly_id?: string;
    item_id?: string;
    status: {
      "@variant": string;
    };
    type_id?: string;
  };
  /** Fuel data for Network Nodes */
  fuel?: {
    max_capacity: string;
    burn_rate_in_ms: string;
    type_id: string;
    unit_volume: string;
    quantity: string;
    is_burning: boolean;
    previous_cycle_elapsed_time: string;
    burn_start_time: string;
    last_updated: string;
  };
  /** Energy source data for Network Nodes */
  energy_source?: {
    max_energy_production: string;
    current_energy_production: string;
    total_reserved_energy: string;
  };
  /** Connected assembly IDs for Network Nodes */
  connected_assembly_ids?: string[];
}

/**
 * OwnerCap JSON structure - returned from Character OwnerCap query
 * Contains the authorized_object_id which is the Character ID
 *
 * @category GraphQL
 */
export interface OwnerCapData {
  authorized_object_id: string;
  id: string;
}

/**
 * Raw Character data structure from the EVE Frontier package
 *
 * @category GraphQL
 */
export interface RawCharacterData {
  id: `0x${string}`;
  key: {
    item_id: string;
    tenant: string;
  };
  tribe_id: number;
  character_address: `0x${string}`;
  metadata: {
    assembly_id: `0x${string}`;
    name: string;
    description: string;
    url: string;
  };
  owner_cap_id: `0x${string}`;
  // Additional fields that may be present
  [key: string]: unknown;
}

/**
 * Processed character/owner information
 *
 * @category GraphQL
 */
export interface CharacterInfo {
  id: string;
  address: string;
  name: string;
  tribeId: number;
  characterId: number;
  _raw?: RawCharacterData;
}
