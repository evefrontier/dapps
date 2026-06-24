import { beforeEach, describe, expect, it } from 'vitest'

import type { InventoryItem } from '../../types'
import { Assemblies, type AssemblyType } from '../../types'
import {
  adjustInventoryUsedCapacity,
  areInventoryItemListsEqual,
  clearInventoryTypeVolumeM3Cache,
  mergeSmartStorageInventoryFromRefetch,
  setInventoryTypeVolumeM3,
} from '../inventory'

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

function createStorageAssembly(
  quantity = 20,
  usedCapacity = '1000',
): AssemblyType<Assemblies.SmartStorageUnit> {
  return {
    type: Assemblies.SmartStorageUnit,
    storage: {
      mainInventory: {
        capacity: '1000000',
        usedCapacity,
        items: [createInventoryItem(77810, quantity)],
      },
      ephemeralInventories: [],
    },
  } as unknown as AssemblyType<Assemblies.SmartStorageUnit>
}

describe('inventory utilities', () => {
  beforeEach(() => {
    clearInventoryTypeVolumeM3Cache()
  })

  it('adjusts used capacity from cached type volume on mint and burn', () => {
    setInventoryTypeVolumeM3(77810, 0.1)

    expect(adjustInventoryUsedCapacity('1000', 10, 77810, 'add')).toBe('2000')
    expect(adjustInventoryUsedCapacity('2000', 10, 77810, 'subtract')).toBe(
      '1000',
    )
  })

  it('floors used capacity at zero when burning more than is tracked', () => {
    setInventoryTypeVolumeM3(77810, 0.1)

    expect(adjustInventoryUsedCapacity('500', 10, 77810, 'subtract')).toBe('0')
  })

  it('leaves used capacity unchanged when type volume is unknown', () => {
    expect(adjustInventoryUsedCapacity('1000', 10, 77810, 'add')).toBe('1000')
  })

  it('keeps optimistic inventory when refetch only moved ancillary fields', () => {
    const current = createStorageAssembly(520, '2000')
    const stale = createStorageAssembly(20, '1500')
    const lastConfirmed = mergeSmartStorageInventoryFromRefetch(
      null,
      stale,
      null,
    ).inventorySignature

    const merged = mergeSmartStorageInventoryFromRefetch(
      current,
      stale,
      lastConfirmed,
    )

    expect(merged.assembly).toBe(current)
    expect(merged.assembly.storage.mainInventory.items).toEqual(
      current.storage.mainInventory.items,
    )
    expect(merged.assembly.storage.mainInventory.usedCapacity).toBe('2000')
    expect(merged.inventorySignature).toBe(lastConfirmed)
  })

  it('accepts refetch inventory when indexer catches up', () => {
    const current = createStorageAssembly(520, '2000')
    const fresh = createStorageAssembly(520, '2000')
    const lastConfirmed = mergeSmartStorageInventoryFromRefetch(
      null,
      createStorageAssembly(20, '1000'),
      null,
    ).inventorySignature

    const merged = mergeSmartStorageInventoryFromRefetch(
      current,
      fresh,
      lastConfirmed,
    )

    expect(merged.assembly.storage.mainInventory.items).toEqual(
      fresh.storage.mainInventory.items,
    )
    expect(merged.inventorySignature).not.toBe(lastConfirmed)
  })

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
