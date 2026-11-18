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
