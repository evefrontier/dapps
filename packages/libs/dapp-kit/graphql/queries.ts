/**
 * GraphQL queries for fetching Sui objects
 */

// ============================================================================
// Core Object Queries
// ============================================================================

/**
 * Query for fetching a specific object by address with BCS-encoded contents
 * Use this for low-level object access with raw BCS data
 *
 * @category GraphQL Queries
 */
export const GET_OBJECT_BY_ADDRESS = `
  query GetObjectByAddress($address: SuiAddress!) {
    object(address: $address) {
      address
      version
      digest
      asMoveObject {
        contents {
          type {
            repr
          }
          bcs
        }
      }
    }
  }
`

/**
 * Object by address with JSON contents and dynamic fields (nodes).
 *
 * @category GraphQL Queries
 */
export const GET_OBJECT_WITH_DYNAMIC_FIELDS = `
  query GetObjectWithDynamicFields($objectId: SuiAddress!) {
    object(address: $objectId) {
      asMoveObject {
        contents {
          json
        }
        dynamicFields {
          nodes {
            contents {
              json
              type {
                layout
              }
            }
            name {
              json
              type {
                repr
              }
            }
          }
        }
      }
    }
  }
`

// ============================================================================
// Entity Queries
// ============================================================================

/**
 * World entity: latest version, contents, and a page of its dynamic fields
 * (components and action maps). Layout sections and inventory item tables
 * nested in component values are resolved inline; `null` for other components.
 *
 * @category GraphQL Queries
 */
export const GET_ENTITY = `
  query GetEntity($address: SuiAddress!, $cursor: String, $table_first: Int!) {
    latestVersion: objectVersions(last: 1, address: $address) {
      nodes { version }
    }
    object(address: $address) {
      asMoveObject {
        contents { type { repr } json }
      }
      dynamicFields(after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          contents {
            name: extract(path: "name") { type { repr } json }
            value: extract(path: "value") {
              type { repr }
              json
              sections: extract(path: "inner.sections.id") {
                asAddress {
                  addressAt {
                    dynamicFields(first: $table_first) {
                      pageInfo { hasNextPage endCursor }
                      nodes {
                        name { type { repr } json }
                        value { ... on MoveValue { type { repr } json } }
                      }
                    }
                  }
                }
              }
              items: extract(path: "inner.items.balances.id") {
                asAddress {
                  addressAt {
                    dynamicFields(first: $table_first) {
                      pageInfo { hasNextPage endCursor }
                      nodes {
                        name { type { repr } json }
                        value { ... on MoveValue { type { repr } json } }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

/**
 * One page of a Move table's entries (the dynamic fields of its UID).
 *
 * @category GraphQL Queries
 */
export const GET_TABLE_ENTRIES = `
  query GetTableEntries($address: SuiAddress!, $first: Int!, $after: String) {
    address(address: $address) {
      dynamicFields(first: $first, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes {
          name { type { repr } json }
          value { ... on MoveValue { type { repr } json } }
        }
      }
    }
  }
`

/**
 * Latest version of an object; a cheap change check before a full fetch.
 *
 * @category GraphQL Queries
 */
export const GET_OBJECT_LATEST_VERSION = `
  query GetObjectLatestVersion($address: SuiAddress!) {
    latestVersion: objectVersions(last: 1, address: $address) {
      nodes { version }
    }
  }
`

/**
 * Owner of an object. Objects transferred to another object's id (e.g. an
 * AccessCap parked on a Character) report an AddressOwner of that object's id.
 *
 * @category GraphQL Queries
 */
export const GET_OBJECT_OWNER = `
  query GetObjectOwner($address: SuiAddress!) {
    object(address: $address) {
      owner {
        __typename
        ... on AddressOwner { address { address } }
        ... on ObjectOwner { address { address } }
      }
    }
  }
`

// ============================================================================
// Owner & Ownership Queries
// ============================================================================

/**
 * Query to get an object's owner and their owned objects of a specific type
 * Useful for finding related objects (e.g., getting a character's assemblies)
 * Returns BCS-encoded data only
 *
 * @category GraphQL Queries
 * @deprecated Walks `object.owner`, which is empty for shared `Entity` objects. Find a wallet's entities with `getOwnedObjectsByType` on the `AccessCap` type instead.
 */
export const GET_OBJECT_OWNER_AND_OWNED_OBJECTS_BY_TYPE = `
  query GetObjectOwnerAndOwnedObjectByType($object: SuiAddress!, $owned_object_type: String) {
    object(address: $object) {
      owner {
        ... on AddressOwner {
          address {
            address
            objects(
              filter: {
                type: $owned_object_type
              }
            ) {
              nodes {
                contents {
                  bcs
                }
                previousTransaction {
                  effects {
                    timestamp
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

/**
 * Query to get an object's owner and their owned objects of a specific type
 * Returns both BCS and JSON-decoded data for easier consumption
 *
 * @category GraphQL Queries
 * @deprecated Walks `object.owner`, which is empty for shared `Entity` objects. Find a wallet's entities with `getOwnedObjectsByType` on the `AccessCap` type instead.
 */
export const GET_OBJECT_OWNER_AND_OWNED_OBJECTS_WITH_JSON = `
  query GetObjectOwnerAndOwnedObjectWithJson($object: SuiAddress!, $owned_object_type: String) {
    object(address: $object) {
      owner {
        ... on AddressOwner {
          address {
            address
            objects(
              filter: {
                type: $owned_object_type
              }
            ) {
              nodes {
                address
                contents {
                  json
                  bcs
                }
                previousTransaction {
                  effects {
                    timestamp
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

/**
 * Query to get full object details with JSON contents
 * Used to fetch character details after getting the character ID from OwnerCap
 *
 * @category GraphQL Queries
 */
export const GET_OBJECT_WITH_JSON = `
  query GetObjectWithJson($address: SuiAddress!) {
    object(address: $address) {
      address
      version
      digest
      asMoveObject {
        contents {
          type {
            repr
          }
          json
          bcs
        }
      }
    }
  }
`

/**
 * Query to get all objects of a specific type owned by an address
 * Returns object addresses only (lightweight)
 *
 * @category GraphQL Queries
 */
export const GET_OWNED_OBJECTS_BY_TYPE = `
  query GetOwnedObjectsByType($owner: SuiAddress!, $object_type: String) {
    address(address: $owner) {
      objects(
        filter: {
          type: $object_type
        }
      ) {
        nodes {
          address
        }
      }
    }
  }
`

/**
 * Query for fetching objects owned by an address filtered by package
 * Returns full object data with dynamic fields
 *
 * @category GraphQL Queries
 */
export const GET_OWNED_OBJECTS_BY_PACKAGE = `
  query GetOwnedObjectsByPackage($owner: SuiAddress!, $packageId: SuiAddress!) {
    objects(
      filter: {
        owner: $owner
        type: { package: $packageId }
      }
    ) {
      nodes {
        address
        version
        asMoveObject {
          contents {
            json
          }
          dynamicFields {
            nodes {
              contents {
                json
                type {
                  layout
                }
              }
              name {
                json
                type {
                  repr
                }
              }
            }
          }
        }
      }
    }
  }
`

// ============================================================================
// Character Queries
// ============================================================================

// ============================================================================
// Singleton & Type-based Queries
// ============================================================================

/**
 * Query to get a singleton object by its type
 * Returns the first object of the specified type (useful for global/singleton objects)
 *
 * @category GraphQL Queries
 */
export const GET_SINGLETON_OBJECT_BY_TYPE = `
  query GetSingletonObjectByType($object_type: String) {
    objects(
      filter: {
        type: $object_type
      }
      first: 1
    ) {
      nodes {
        address
      }
    }
  }
`

/**
 * Query to get all objects of a specific type (global search)
 * Use with caution - may return many results
 *
 * @category GraphQL Queries
 */
export const GET_OBJECTS_BY_TYPE = `
  query GetObjectsByType($object_type: String, $first: Int, $after: String) {
    objects(
      filter: {
        type: $object_type
      }
      first: $first
      after: $after
    ) {
      nodes {
        address
        version
        asMoveObject {
          contents {
            json
            type {
              repr
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`
