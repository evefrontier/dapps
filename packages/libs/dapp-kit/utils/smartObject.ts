import type { MoveObjectData } from '../graphql'
import { Assemblies, type AssemblyType, QueryParams } from '../types'
import { DEFAULT_TENANT } from './constants'
import { getDatahubGameInfo } from './datahub'
import {
  getInventoryTypeVolumeM3,
  mergeSmartStorageInventoryFromRefetch,
  setInventoryTypeVolumeM3,
} from './inventory'

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

/** Extracts the in-game type ID from a Move object's JSON ('0' if absent). */
export function getMoveObjectTypeId(moveObject: MoveObjectData): string {
  const rawJson = moveObject.contents?.json as
    | { type_id?: string; status?: { type_id?: string } }
    | undefined
  return rawJson?.type_id || rawJson?.status?.type_id || '0'
}

/** Values last confirmed by the indexer, used to keep optimistic state on stale refetches. */
export type ConfirmedSignatures = {
  state: string | null
  fuel: string | null
  inventory: string | null
}

export const EMPTY_CONFIRMED_SIGNATURES: ConfirmedSignatures = {
  state: null,
  fuel: null,
  inventory: null,
}

/**
 * Reconciles a freshly fetched assembly with the current (possibly optimistic)
 * one. On a refetch, if the indexer returns the same state, fuel or inventory
 * we last confirmed, it hasn't caught up yet: keep the optimistic value rather
 * than reverting it. An initial fetch always takes the fetched assembly.
 */
export function reconcileRefetchedAssembly(
  currentAssembly: AssemblyType<Assemblies> | null,
  fetched: AssemblyType<Assemblies>,
  isInitialFetch: boolean,
  confirmed: ConfirmedSignatures,
): {
  assembly: AssemblyType<Assemblies>
  confirmed: ConfirmedSignatures
} {
  const isRefetch = !isInitialFetch && currentAssembly !== null
  let next = fetched
  let nextConfirmed = confirmed

  // State stale-refetch protection (all assembly types).
  if (isRefetch && confirmed.state !== null && next.state === confirmed.state) {
    next = { ...next, state: currentAssembly.state }
  } else {
    nextConfirmed = { ...nextConfirmed, state: next.state }
  }

  if (next.type === Assemblies.NetworkNode) {
    const { quantity, isBurning } = next.networkNode.fuel
    const fuelSignature = `${quantity}:${isBurning}`

    if (
      isRefetch &&
      currentAssembly.type === Assemblies.NetworkNode &&
      confirmed.fuel !== null &&
      fuelSignature === confirmed.fuel
    ) {
      return { assembly: currentAssembly, confirmed: nextConfirmed }
    }

    return {
      assembly: next,
      confirmed: { ...nextConfirmed, fuel: fuelSignature },
    }
  }

  if (next.type !== Assemblies.SmartStorageUnit) {
    return { assembly: next, confirmed: nextConfirmed }
  }

  // Merge against the prior storage state only on refetches; an initial
  // fetch (or a type change) has no optimistic state to keep.
  const previousStorage =
    isRefetch && currentAssembly.type === Assemblies.SmartStorageUnit
      ? currentAssembly
      : null

  const { assembly, inventorySignature } =
    mergeSmartStorageInventoryFromRefetch(
      previousStorage,
      next,
      confirmed.inventory,
    )
  return {
    assembly,
    confirmed: { ...nextConfirmed, inventory: inventorySignature },
  }
}

/** Warms the type-volume cache for every item type held by a storage unit. */
export function primeInventoryTypeVolumes(
  assembly: AssemblyType<Assemblies> | null,
) {
  if (!assembly || assembly.type !== Assemblies.SmartStorageUnit) return

  const typeIds = new Set<number>()
  for (const item of assembly.storage.mainInventory.items ?? []) {
    const typeId = Number(item.type_id)
    if (Number.isFinite(typeId)) typeIds.add(typeId)
  }
  for (const ephemeral of assembly.storage.ephemeralInventories ?? []) {
    for (const item of ephemeral.ephemeralInventoryItems ?? []) {
      const typeId = Number(item.type_id)
      if (Number.isFinite(typeId)) typeIds.add(typeId)
    }
  }

  for (const typeId of typeIds) {
    // getDatahubGameInfo is uncached and this runs on every poll/refetch;
    // skip type volumes already in the cache.
    if (getInventoryTypeVolumeM3(typeId) !== undefined) continue
    void getDatahubGameInfo(typeId)
      .then((info) => {
        setInventoryTypeVolumeM3(typeId, info.volume)
      })
      .catch(() => {})
  }
}
