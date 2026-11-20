import { QueryParams } from '../types'
import { DEFAULT_TENANT } from './constants'

/** Input for fetching object data: either itemId + tenant (derive object ID) or a Sui object ID directly.
 * @category Types
 */
export type FetchObjectDataInput =
  | { itemId: string; selectedTenant: string }
  | { objectId: string }

/** The object a SmartObjectProvider shows, as chosen by env or query params. */
export type ObjectSelection = {
  /** A Sui object ID when isObjectIdDirect, otherwise an in-game item ID. */
  objectId: string
  tenant: string
  isObjectIdDirect: boolean
}

/**
 * Reads the object to show: VITE_OBJECT_ID (a Sui object ID) wins, else the
 * ?itemId= query param. Tenant comes from ?tenant= with fallback DEFAULT_TENANT.
 * Returns null when neither is set.
 */
export function readObjectSelection(
  search: string,
  envObjectId: string | undefined,
): ObjectSelection | null {
  const queryParams = new URLSearchParams(search)
  const tenant = queryParams.get(QueryParams.TENANT)?.trim() || DEFAULT_TENANT

  if (envObjectId) {
    return { objectId: envObjectId, tenant, isObjectIdDirect: true }
  }

  const queryItemId = queryParams.get(QueryParams.ITEM_ID)
  if (queryItemId) {
    return { objectId: queryItemId, tenant, isObjectIdDirect: false }
  }

  return null
}

export function toFetchObjectDataInput(
  selectedObjectId: string,
  selectedTenant: string,
  isObjectIdDirect: boolean,
): FetchObjectDataInput {
  return isObjectIdDirect
    ? { objectId: selectedObjectId }
    : { itemId: selectedObjectId, selectedTenant }
}
