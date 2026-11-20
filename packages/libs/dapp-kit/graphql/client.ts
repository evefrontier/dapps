import { GRAPHQL_CLIENT_ID, getSuiGraphqlEndpoint } from '../utils/constants'
import {
  GET_ENTITY,
  GET_EVENTS_BY_TYPE,
  GET_OBJECT_BY_ADDRESS,
  GET_OBJECT_LATEST_VERSION,
  GET_OBJECT_OWNER,
  GET_OBJECT_OWNER_AND_OWNED_OBJECTS_BY_TYPE,
  GET_OBJECT_OWNER_AND_OWNED_OBJECTS_WITH_JSON,
  GET_OBJECT_WITH_DYNAMIC_FIELDS,
  GET_OBJECT_WITH_JSON,
  GET_OBJECTS_BY_TYPE,
  GET_OWNED_OBJECTS_BY_PACKAGE,
  GET_OWNED_OBJECTS_BY_TYPE,
  GET_SINGLETON_OBJECT_BY_TYPE,
  GET_TABLE_ENTRIES,
} from './queries'
import type {
  GetEntityResponse,
  GetEventsByTypeResponse,
  GetObjectByAddressResponse,
  GetObjectLatestVersionResponse,
  GetObjectOwnerAndOwnedObjectsResponse,
  GetObjectOwnerAndOwnedObjectsWithJsonResponse,
  GetObjectOwnerResponse,
  GetObjectResponse,
  GetObjectsByTypeResponse,
  GetObjectWithJsonResponse,
  GetOwnedObjectsByPackageResponse,
  GetOwnedObjectsByTypeResponse,
  GetSingletonObjectByTypeResponse,
  GetTableEntriesResponse,
  GraphQLResponse,
} from './types'

/**
 * Execute a GraphQL query against the Sui blockchain endpoint.
 *
 * This is the low-level function used by all other GraphQL helper functions.
 * Use this when you need to execute custom queries not covered by the helper functions.
 *
 * @category GraphQL Client
 * @typeParam T - The expected response data type
 * @param query - The GraphQL query string
 * @param variables - Variables to pass to the query
 * @returns Promise resolving to the GraphQL response
 * @throws {Error} If the HTTP request fails
 *
 * @example Custom query
 * ```typescript
 * const result = await executeGraphQLQuery<MyResponseType>(
 *   `query GetObject($address: SuiAddress!) {
 *     object(address: $address) {
 *       asMoveObject { contents { json } }
 *     }
 *   }`,
 *   { address: "0x123..." }
 * );
 * console.log(result.data?.object?.asMoveObject?.contents?.json);
 * ```
 */
export async function executeGraphQLQuery<T = unknown>(
  query: string,
  variables: Record<string, unknown>,
): Promise<GraphQLResponse<T>> {
  const response = await fetch(getSuiGraphqlEndpoint(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-ID': GRAPHQL_CLIENT_ID,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return response.json()
}

// ============================================================================
// Helper Functions for Common Queries
// ============================================================================

/**
 * Fetch a Sui object by its address with BCS-encoded contents.
 *
 * Use this for low-level object access when you need raw BCS data.
 * For JSON-decoded data, use {@link getObjectWithJson} instead.
 *
 * @category GraphQL Client
 * @param address - The Sui object address (0x...)
 * @returns Promise resolving to object with BCS contents
 *
 * @example
 * ```typescript
 * const result = await getObjectByAddress("0x123...");
 * const bcsData = result.data?.object?.asMoveObject?.contents?.bcs;
 * ```
 */
export async function getObjectByAddress(address: string) {
  return executeGraphQLQuery<GetObjectByAddressResponse>(
    GET_OBJECT_BY_ADDRESS,
    { address },
  )
}

/**
 * Fetch a Sui object with its dynamic fields in JSON format.
 *
 * Retrieves the object's contents and all associated dynamic fields,
 * which is useful for assemblies that store data in dynamic fields
 * (e.g., inventory items, configuration).
 *
 * @category GraphQL Client
 * @param objectId - The Sui object ID
 * @returns Promise resolving to object with dynamic fields
 *
 * @example
 * ```typescript
 * const result = await getObjectWithDynamicFields("0x123...");
 * const dynamicFields = result.data?.object?.asMoveObject?.dynamicFields?.nodes;
 * dynamicFields?.forEach(field => {
 *   console.log(field.name.json, field.contents.json);
 * });
 * ```
 */
export async function getObjectWithDynamicFields(objectId: string) {
  return executeGraphQLQuery<GetObjectResponse>(
    GET_OBJECT_WITH_DYNAMIC_FIELDS,
    { objectId },
  )
}

/**
 * Fetch a world entity: latest version, contents, and a page of its dynamic
 * fields (components and action maps).
 *
 * Layout sections and inventory item tables nested in component values are
 * resolved inline, up to `tableFirst` entries each. Page the rest with
 * {@link getTableEntries} using the table id from the component JSON.
 *
 * @category GraphQL Client
 * @param address - The entity's Sui object ID
 * @param options - Pagination options
 * @param options.cursor - Cursor for the next page of the entity's dynamicFields
 * @param options.tableFirst - Max entries per nested table (default: 50)
 * @returns Promise resolving to the entity's version, contents and dynamic fields
 */
export async function getEntity(
  address: string,
  options?: { cursor?: string; tableFirst?: number },
) {
  return executeGraphQLQuery<GetEntityResponse>(GET_ENTITY, {
    address,
    cursor: options?.cursor ?? null,
    table_first: options?.tableFirst ?? 50,
  })
}

/**
 * Fetch one page of a Move table's entries by the table's UID.
 *
 * @category GraphQL Client
 * @param tableId - The table's UID (e.g. a Layout's `inner.sections.id`)
 * @param options - Pagination options
 * @param options.first - Number of entries per page (default: 50)
 * @param options.after - Cursor for the next page
 * @returns Promise resolving to a page of table entries
 */
export async function getTableEntries(
  tableId: string,
  options?: { first?: number; after?: string },
) {
  return executeGraphQLQuery<GetTableEntriesResponse>(GET_TABLE_ENTRIES, {
    address: tableId,
    first: options?.first ?? 50,
    after: options?.after ?? null,
  })
}

/**
 * Fetch only an object's latest version, to detect changes cheaply.
 *
 * @category GraphQL Client
 * @param address - The Sui object ID
 * @returns Promise resolving to the latest version node
 */
export async function getObjectLatestVersion(address: string) {
  return executeGraphQLQuery<GetObjectLatestVersionResponse>(
    GET_OBJECT_LATEST_VERSION,
    { address },
  )
}

/**
 * Fetch an object's owner.
 *
 * @category GraphQL Client
 * @param address - The Sui object ID
 * @returns Promise resolving to the owner (`__typename` plus address when owned)
 */
export async function getObjectOwner(address: string) {
  return executeGraphQLQuery<GetObjectOwnerResponse>(GET_OBJECT_OWNER, {
    address,
  })
}

/**
 * Fetch a Sui object with JSON-decoded contents.
 *
 * This is the most common way to fetch object data when you need
 * to read the object's fields as JavaScript objects.
 *
 * @category GraphQL Client
 * @param address - The Sui object address
 * @returns Promise resolving to object with JSON contents
 *
 * @example
 * ```typescript
 * const result = await getObjectWithJson("0x123...");
 * const json = result.data?.object?.asMoveObject?.contents?.json;
 * console.log(json); // { id: "...", name: "...", ... }
 * ```
 */
export async function getObjectWithJson(address: string) {
  return executeGraphQLQuery<GetObjectWithJsonResponse>(GET_OBJECT_WITH_JSON, {
    address,
  })
}

/**
 * Get an object's owner and their owned objects of a specific type.
 *
 * Useful for traversing ownership chains, e.g., finding all assemblies
 * owned by a specific character.
 *
 * @category GraphQL Client
 * @param objectAddress - The Sui object address to query owner of
 * @param ownedObjectType - Optional type filter for owned objects
 * @returns Promise resolving to owner info and owned objects (BCS format)
 *
 * @example
 * ```typescript
 * const result = await getObjectOwnerAndOwnedObjectsByType(
 *   "0x123...",
 *   "0xpackage::module::MyType"
 * );
 * const ownerAddress = result.data?.object?.owner?.address?.address;
 * ```
 * @deprecated Walks `object.owner`, which is empty for shared `Entity` objects. Find a wallet's entities with {@link getOwnedObjectsByType} on the `AccessCap` type instead.
 */
export async function getObjectOwnerAndOwnedObjectsByType(
  objectAddress: string,
  ownedObjectType?: string,
) {
  return executeGraphQLQuery<GetObjectOwnerAndOwnedObjectsResponse>(
    GET_OBJECT_OWNER_AND_OWNED_OBJECTS_BY_TYPE,
    {
      object: objectAddress,
      owned_object_type: ownedObjectType,
    },
  )
}

/**
 * Get an object's owner and their owned objects with JSON data.
 *
 * Similar to {@link getObjectOwnerAndOwnedObjectsByType} but returns
 * JSON-decoded contents for easier consumption.
 *
 * @category GraphQL Client
 * @param objectAddress - The Sui object address
 * @param ownedObjectType - Optional type filter for owned objects
 * @returns Promise resolving to owner info and owned objects (JSON format)
 * @deprecated Walks `object.owner`, which is empty for shared `Entity` objects. Find a wallet's entities with {@link getOwnedObjectsByType} on the `AccessCap` type instead.
 */
export async function getObjectOwnerAndOwnedObjectsWithJson(
  objectAddress: string,
  ownedObjectType?: string,
) {
  return executeGraphQLQuery<GetObjectOwnerAndOwnedObjectsWithJsonResponse>(
    GET_OBJECT_OWNER_AND_OWNED_OBJECTS_WITH_JSON,
    {
      object: objectAddress,
      owned_object_type: ownedObjectType,
    },
  )
}

/**
 * Get all objects of a specific type owned by an address.
 *
 * Returns only object addresses (lightweight). Use this when you need
 * to find objects and will fetch their details separately.
 *
 * @category GraphQL Client
 * @param owner - The owner's Sui address
 * @param objectType - Optional Move type filter (e.g., "0xpkg::module::Type")
 * @returns Promise resolving to list of owned object addresses
 *
 * @example
 * ```typescript
 * const result = await getOwnedObjectsByType(
 *   "0xowner...",
 *   "0xworld::smart_storage_unit::SmartStorageUnit"
 * );
 * const addresses = result.data?.address?.objects?.nodes.map(n => n.address);
 * ```
 */
export async function getOwnedObjectsByType(
  owner: string,
  objectType?: string,
) {
  return executeGraphQLQuery<GetOwnedObjectsByTypeResponse>(
    GET_OWNED_OBJECTS_BY_TYPE,
    {
      owner,
      object_type: objectType,
    },
  )
}

/**
 * Get all objects owned by an address filtered by package.
 *
 * Returns full object data with dynamic fields. Use this when you need
 * all objects from a specific package (e.g., all EVE Frontier objects).
 *
 * @category GraphQL Client
 * @param owner - The owner's Sui address
 * @param packageId - The Move package ID to filter by
 * @returns Promise resolving to full object data including dynamic fields
 *
 * @example
 * ```typescript
 * const result = await getOwnedObjectsByPackage(
 *   "0xowner...",
 *   "0xworld_package_id..."
 * );
 * const objects = result.data?.objects?.nodes;
 * ```
 */
export async function getOwnedObjectsByPackage(
  owner: string,
  packageId: string,
) {
  return executeGraphQLQuery<GetOwnedObjectsByPackageResponse>(
    GET_OWNED_OBJECTS_BY_PACKAGE,
    {
      owner,
      packageId,
    },
  )
}

/**
 * Get a singleton object by its Move type.
 *
 * Useful for global/singleton objects where there's only one instance
 * of a particular type on-chain.
 *
 * @category GraphQL Client
 * @param objectType - The full Move type string
 * @returns Promise resolving to the singleton object address
 *
 * @example
 * ```typescript
 * const result = await getSingletonObjectByType("0xpkg::config::GlobalConfig");
 * const address = result.data?.objects?.nodes[0]?.address;
 * ```
 */
export async function getSingletonObjectByType(objectType: string) {
  return executeGraphQLQuery<GetSingletonObjectByTypeResponse>(
    GET_SINGLETON_OBJECT_BY_TYPE,
    {
      object_type: objectType,
    },
  )
}

/**
 * Get all objects of a specific type with pagination.
 *
 * Use with caution as this may return many results. Supports cursor-based
 * pagination for iterating through large result sets.
 *
 * @category GraphQL Client
 * @param objectType - The full Move type string
 * @param options - Pagination options
 * @param options.first - Number of results per page (default: 50)
 * @param options.after - Cursor for next page
 * @returns Promise resolving to paginated object list
 *
 * @example Paginated fetch
 * ```typescript
 * let cursor: string | undefined;
 * do {
 *   const result = await getObjectsByType("0xpkg::module::Type", {
 *     first: 50,
 *     after: cursor
 *   });
 *   const objects = result.data?.objects?.nodes;
 *   cursor = result.data?.objects?.pageInfo?.hasNextPage
 *     ? result.data?.objects?.pageInfo?.endCursor
 *     : undefined;
 * } while (cursor);
 * ```
 */
export async function getObjectsByType(
  objectType: string,
  options?: { first?: number; after?: string },
) {
  return executeGraphQLQuery<GetObjectsByTypeResponse>(GET_OBJECTS_BY_TYPE, {
    object_type: objectType,
    first: options?.first ?? 50,
    after: options?.after,
  })
}

/**
 * Get events of a Move event type with pagination, oldest first.
 *
 * Use with caution as this may return many results. Event fields cannot be
 * filtered on, so callers page through every event of the type.
 *
 * @category GraphQL Client
 * @param eventType - The full Move event type string
 * @param options - Pagination options
 * @param options.first - Number of results per page (default: 50)
 * @param options.after - Cursor for next page
 * @returns Promise resolving to paginated event list
 */
export async function getEventsByType(
  eventType: string,
  options?: { first?: number; after?: string },
) {
  return executeGraphQLQuery<GetEventsByTypeResponse>(GET_EVENTS_BY_TYPE, {
    event_type: eventType,
    first: options?.first ?? 50,
    after: options?.after,
  })
}
