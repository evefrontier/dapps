import { describe, expect, it } from 'vitest'

import type { InventoryItem } from '../../types'
import { areInventoryItemListsEqual } from '../inventory'

function createInventoryItem(typeId: number, quantity: number): InventoryItem {
  return {
    id: `item-${typeId}`,
    item_id: `item-${typeId}`,
    location: { location_hash: 'main' },
    name: `Item ${typeId}`,
    quantity,
    tenant: 'stillness',
    type_id: typeId,
  }
}

describe('inventory utilities', () => {
  it('treats inventory lists as equal when type quantities match in different orders', () => {
    expect(
      areInventoryItemListsEqual(
        [createInventoryItem(77810, 20), createInventoryItem(82128, 500)],
        [createInventoryItem(82128, 500), createInventoryItem(77810, 20)],
      ),
    ).toBe(true)
  })

  it('treats duplicate item rows as equal to their merged quantity', () => {
    expect(
      areInventoryItemListsEqual(
        [createInventoryItem(77810, 20), createInventoryItem(77810, 30)],
        [createInventoryItem(77810, 50)],
      ),
    ).toBe(true)
  })

  it('detects quantity changes', () => {
    expect(
      areInventoryItemListsEqual(
        [createInventoryItem(77810, 20)],
        [createInventoryItem(77810, 19)],
      ),
    ).toBe(false)
  })

  it('detects item type changes', () => {
    expect(
      areInventoryItemListsEqual(
        [createInventoryItem(77810, 20)],
        [createInventoryItem(82128, 20)],
      ),
    ).toBe(false)
  })
})
