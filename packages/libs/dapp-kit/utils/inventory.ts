import type { Assemblies, AssemblyType, InventoryItem } from '../types'

const typeVolumeM3ById = new Map<number, number>()

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

/** Cache Datahub volume (m³ per unit) for optimistic used-capacity updates. */
export function setInventoryTypeVolumeM3(typeId: number, volumeM3: number) {
  if (!Number.isFinite(typeId) || !Number.isFinite(volumeM3) || volumeM3 < 0) {
    return
  }
  typeVolumeM3ById.set(typeId, volumeM3)
}

export function getInventoryTypeVolumeM3(typeId: number): number | undefined {
  return typeVolumeM3ById.get(typeId)
}

/** Clear cached volumes (for tests). */
export function clearInventoryTypeVolumeM3Cache() {
  typeVolumeM3ById.clear()
}

/** On-chain used_capacity is litres (dm³); Datahub volume is m³ per unit. */
export function getInventoryQuantityVolumeDm3(
  quantity: number,
  typeId: number,
): number | null {
  const volumeM3 = getInventoryTypeVolumeM3(typeId)
  if (volumeM3 === undefined) return null
  return Math.round(quantity * volumeM3 * 1000)
}

export function adjustInventoryUsedCapacity(
  usedCapacity: string,
  quantity: number,
  typeId: number,
  operation: 'add' | 'subtract',
): string
export function adjustInventoryUsedCapacity(
  usedCapacity: string | undefined,
  quantity: number,
  typeId: number,
  operation: 'add' | 'subtract',
): string | undefined
export function adjustInventoryUsedCapacity(
  usedCapacity: string | undefined,
  quantity: number,
  typeId: number,
  operation: 'add' | 'subtract',
): string | undefined {
  const volumeDeltaDm3 = getInventoryQuantityVolumeDm3(quantity, typeId)
  if (volumeDeltaDm3 === null || usedCapacity === undefined) {
    return usedCapacity
  }

  const currentUsedCapacity = toFiniteNumber(usedCapacity)
  const nextUsedCapacity =
    operation === 'add'
      ? currentUsedCapacity + volumeDeltaDm3
      : Math.max(0, currentUsedCapacity - volumeDeltaDm3)

  return String(nextUsedCapacity)
}

export function sortInventoryItemsByQuantity(
  items: InventoryItem[] | undefined,
): InventoryItem[] {
  return [...(items ?? [])].sort((a, b) => {
    const quantityDifference =
      toFiniteNumber(b.quantity) - toFiniteNumber(a.quantity)
    if (quantityDifference !== 0) return quantityDifference
    return toFiniteNumber(a.type_id) - toFiniteNumber(b.type_id)
  })
}

function getInventoryItemSignatures(items: InventoryItem[] | undefined) {
  const quantityByTypeId = new Map<number, number>()

  ;(items ?? []).forEach((item) => {
    const typeId = toFiniteNumber(item.type_id, Number.NaN)
    if (!Number.isFinite(typeId)) return

    quantityByTypeId.set(
      typeId,
      (quantityByTypeId.get(typeId) ?? 0) + toFiniteNumber(item.quantity),
    )
  })

  return Array.from(quantityByTypeId.entries())
    .filter(([, quantity]) => quantity > 0)
    .sort(([leftTypeId], [rightTypeId]) => leftTypeId - rightTypeId)
}

function getInventoryQuantitySignature(
  items: InventoryItem[] | undefined,
): string {
  return JSON.stringify(getInventoryItemSignatures(items))
}

export function areInventoryItemListsEqual(
  leftItems: InventoryItem[] | undefined,
  rightItems: InventoryItem[] | undefined,
): boolean {
  const leftSignatures = getInventoryItemSignatures(leftItems)
  const rightSignatures = getInventoryItemSignatures(rightItems)

  if (leftSignatures.length !== rightSignatures.length) return false

  return leftSignatures.every(([leftTypeId, leftQuantity], index) => {
    const rightSignature = rightSignatures[index]
    if (!rightSignature) return false
    const [rightTypeId, rightQuantity] = rightSignature
    return leftTypeId === rightTypeId && leftQuantity === rightQuantity
  })
}

function preserveStorageInventoryItemsWhenEqual(
  currentAssembly: AssemblyType<Assemblies.SmartStorageUnit>,
  nextAssembly: AssemblyType<Assemblies.SmartStorageUnit>,
): AssemblyType<Assemblies.SmartStorageUnit> {
  if (
    !areInventoryItemListsEqual(
      currentAssembly.storage.mainInventory.items,
      nextAssembly.storage.mainInventory.items,
    )
  ) {
    return nextAssembly
  }

  return {
    ...nextAssembly,
    storage: {
      ...nextAssembly.storage,
      mainInventory: {
        ...nextAssembly.storage.mainInventory,
        items: currentAssembly.storage.mainInventory.items,
        usedCapacity:
          currentAssembly.storage.mainInventory.usedCapacity ??
          nextAssembly.storage.mainInventory.usedCapacity,
      },
    },
  }
}

/**
 * Merge a GraphQL refetch into optimistic storage state without clobbering
 * stream-updated items when the indexer has only moved ancillary fields first
 * (e.g. used_capacity) while item quantities are still stale.
 */
export function mergeSmartStorageInventoryFromRefetch(
  currentAssembly: AssemblyType<Assemblies.SmartStorageUnit> | null,
  nextAssembly: AssemblyType<Assemblies.SmartStorageUnit>,
  lastConfirmedInventorySignature: string | null,
): {
  assembly: AssemblyType<Assemblies.SmartStorageUnit>
  inventorySignature: string
} {
  const nextSignature = getInventoryQuantitySignature(
    nextAssembly.storage.mainInventory.items,
  )

  if (
    currentAssembly &&
    lastConfirmedInventorySignature !== null &&
    nextSignature === lastConfirmedInventorySignature &&
    !areInventoryItemListsEqual(
      currentAssembly.storage.mainInventory.items,
      nextAssembly.storage.mainInventory.items,
    )
  ) {
    return {
      assembly: currentAssembly,
      inventorySignature: lastConfirmedInventorySignature,
    }
  }

  const mergedAssembly = currentAssembly
    ? preserveStorageInventoryItemsWhenEqual(currentAssembly, nextAssembly)
    : nextAssembly

  return {
    assembly: mergedAssembly,
    inventorySignature: nextSignature,
  }
}
