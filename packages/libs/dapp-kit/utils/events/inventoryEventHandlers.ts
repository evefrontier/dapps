import type { SuiEvent } from '@mysten/sui/jsonRpc'

import { Assemblies, type AssemblyType, type InventoryItem } from '../../types'
import { getEveWorldPackageId } from '../constants'
import {
  adjustInventoryUsedCapacity,
  sortInventoryItemsByQuantity,
} from '../inventory'
import { isRecord } from '../utils'

const INVENTORY_EVENT_NAMES = ['ItemBurnedEvent', 'ItemMintedEvent'] as const

type AssemblyEventKey = {
  item_id?: string | number
  tenant?: string
}

type AssemblyEventPayload = {
  assembly_id?: string
  assembly_key?: AssemblyEventKey
  item_id?: string
  quantity?: number
  type_id?: string | number
}

export type AssemblyEventTarget = {
  eventTypes: readonly string[]
  itemId?: string
  objectId?: string
  tenant?: string
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : fallback
}

function parseAssemblyEventKey(raw: unknown): AssemblyEventKey | undefined {
  if (!isRecord(raw)) return undefined
  const { item_id, tenant } = raw
  if (
    (typeof item_id === 'string' || typeof item_id === 'number') &&
    typeof tenant === 'string'
  ) {
    return { item_id, tenant }
  }
  return undefined
}

function parseAssemblyEventPayload(
  event: Pick<SuiEvent, 'parsedJson'>,
): AssemblyEventPayload | null {
  const json = event.parsedJson
  if (!isRecord(json)) return null

  const payload: AssemblyEventPayload = {}

  if (typeof json['assembly_id'] === 'string')
    payload.assembly_id = json['assembly_id']
  if (typeof json['item_id'] === 'string') payload.item_id = json['item_id']
  if (typeof json['quantity'] === 'number') payload.quantity = json['quantity']
  if (
    typeof json['type_id'] === 'string' ||
    typeof json['type_id'] === 'number'
  ) {
    payload.type_id = json['type_id']
  }

  const assemblyKey = parseAssemblyEventKey(json['assembly_key'])
  if (assemblyKey) payload.assembly_key = assemblyKey

  return payload
}

function normalizeObjectId(value: string | undefined) {
  return value?.toLowerCase()
}

function parseInventoryEventDelta(
  event: Pick<SuiEvent, 'type' | 'parsedJson'>,
) {
  const payload = parseAssemblyEventPayload(event)
  if (!payload) return null

  const typeId = Number(payload.type_id)
  const quantity = Number(payload.quantity)
  if (!Number.isFinite(typeId) || !Number.isFinite(quantity) || quantity <= 0)
    return null

  const operation = event.type.endsWith('::inventory::ItemMintedEvent')
    ? ('add' as const)
    : event.type.endsWith('::inventory::ItemBurnedEvent')
      ? ('subtract' as const)
      : null

  if (!operation) return null

  return {
    itemId: payload.item_id ?? String(typeId),
    quantity,
    tenant: payload.assembly_key?.tenant ?? '',
    typeId,
    operation,
  }
}

function isOptimisticInventoryItem(item: InventoryItem): boolean {
  return item.id.startsWith('optimistic-')
}

function mergeInventoryItemsByTypeId(items: InventoryItem[]): InventoryItem[] {
  const itemsByTypeId = new Map<number, InventoryItem>()

  items.forEach((item) => {
    const typeId = toFiniteNumber(item.type_id, Number.NaN)
    if (!Number.isFinite(typeId)) return

    const existing = itemsByTypeId.get(typeId)
    if (!existing) {
      itemsByTypeId.set(typeId, {
        ...item,
        quantity: toFiniteNumber(item.quantity),
        type_id: typeId,
      })
      return
    }

    const quantity =
      toFiniteNumber(existing.quantity) + toFiniteNumber(item.quantity)
    if (quantity <= 0) {
      itemsByTypeId.delete(typeId)
      return
    }

    const preferred =
      isOptimisticInventoryItem(existing) && !isOptimisticInventoryItem(item)
        ? item
        : existing
    itemsByTypeId.set(typeId, { ...preferred, quantity, type_id: typeId })
  })

  return Array.from(itemsByTypeId.values())
}

function computeNextItems(
  items: InventoryItem[],
  delta: NonNullable<ReturnType<typeof parseInventoryEventDelta>>,
): InventoryItem[] {
  const itemIndex = items.findIndex(
    (item) => toFiniteNumber(item.type_id) === delta.typeId,
  )

  if (itemIndex === -1) {
    if (delta.operation === 'subtract') return items
    return [
      ...items,
      {
        id: `optimistic-${delta.typeId}`,
        item_id: delta.itemId,
        location: { location_hash: '' },
        quantity: delta.quantity,
        tenant: delta.tenant,
        type_id: delta.typeId,
        name: `Type ${delta.typeId}`,
      } satisfies InventoryItem,
    ]
  }

  return items.flatMap((item, index) => {
    if (index !== itemIndex) return [item]
    const quantity =
      delta.operation === 'add'
        ? toFiniteNumber(item.quantity) + delta.quantity
        : Math.max(0, toFiniteNumber(item.quantity) - delta.quantity)
    return quantity === 0 ? [] : [{ ...item, quantity }]
  })
}

export function getInventoryEventTypes(
  packageId = getEveWorldPackageId(),
): string[] {
  return INVENTORY_EVENT_NAMES.map(
    (eventName) => `${packageId}::inventory::${eventName}`,
  )
}

export function isRelevantAssemblyInventoryEvent(
  event: Pick<SuiEvent, 'type' | 'parsedJson'>,
  target: AssemblyEventTarget,
): boolean {
  if (!target.eventTypes.includes(event.type)) return false

  const payload = parseAssemblyEventPayload(event)
  if (!payload) return false

  if (
    target.objectId &&
    normalizeObjectId(payload.assembly_id) ===
      normalizeObjectId(target.objectId)
  ) {
    return true
  }

  if (!target.itemId || !target.tenant) return false

  return (
    String(payload.assembly_key?.item_id ?? '') === String(target.itemId) &&
    payload.assembly_key?.tenant === target.tenant
  )
}

export function getInventoryEventTarget({
  assembly,
  eventTypes,
  isObjectIdDirect,
  selectedObjectId,
  selectedTenant,
}: {
  assembly: AssemblyType<Assemblies> | null
  eventTypes: readonly string[]
  isObjectIdDirect: boolean
  selectedObjectId: string
  selectedTenant: string
}): AssemblyEventTarget {
  if (assembly?.type === Assemblies.SmartStorageUnit) {
    if (assembly.id) return { eventTypes, objectId: assembly.id }
    if (assembly.item_id) {
      return {
        eventTypes,
        itemId: String(assembly.item_id),
        tenant: selectedTenant,
      }
    }
  }

  if (isObjectIdDirect) return { eventTypes, objectId: selectedObjectId }

  return { eventTypes, itemId: selectedObjectId, tenant: selectedTenant }
}

export function applyInventoryEventToAssembly(
  assembly: AssemblyType<Assemblies> | null,
  event: Pick<SuiEvent, 'type' | 'parsedJson'>,
): AssemblyType<Assemblies> | null {
  if (!assembly || assembly.type !== Assemblies.SmartStorageUnit)
    return assembly

  const delta = parseInventoryEventDelta(event)
  if (!delta) return assembly

  const items = assembly.storage.mainInventory.items ?? []

  return {
    ...assembly,
    storage: {
      ...assembly.storage,
      mainInventory: {
        ...assembly.storage.mainInventory,
        usedCapacity: adjustInventoryUsedCapacity(
          assembly.storage.mainInventory.usedCapacity,
          delta.quantity,
          delta.typeId,
          delta.operation,
        ),
        items: sortInventoryItemsByQuantity(
          mergeInventoryItemsByTypeId(computeNextItems(items, delta)),
        ),
      },
    },
  }
}
