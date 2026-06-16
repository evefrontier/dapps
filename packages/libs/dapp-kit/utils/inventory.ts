import type { InventoryItem } from '../types'

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
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
