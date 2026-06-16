import { bcs } from '@mysten/sui/bcs'

const BcsObjectId = bcs.fixedArray(32, bcs.u8()).transform({
  input: (value: number[]) => value,
  output: (value: number[]) =>
    `0x${value.map((byte) => byte.toString(16).padStart(2, '0')).join('')}`,
})

const TenantKey = bcs.struct('TenantKey', {
  item_id: bcs.u64(),
  tenant: bcs.string(),
})

const InventoryMoveEvent = bcs.struct('InventoryMoveEvent', {
  assembly_id: BcsObjectId,
  assembly_key: TenantKey,
  character_id: BcsObjectId,
  character_key: TenantKey,
  item_id: bcs.u64(),
  type_id: bcs.u64(),
  quantity: bcs.u32(),
})

export type DecodedInventoryMoveEvent = {
  assembly_id: string
  assembly_key: {
    item_id: string
    tenant: string
  }
  character_id: string
  character_key: {
    item_id: string
    tenant: string
  }
  item_id: string
  type_id: string
  quantity: number
}

export function decodeInventoryEventBcs(
  bytes: Uint8Array,
): DecodedInventoryMoveEvent {
  const decoded = InventoryMoveEvent.parse(bytes)

  return {
    assembly_id: decoded.assembly_id,
    assembly_key: {
      item_id: String(decoded.assembly_key.item_id),
      tenant: decoded.assembly_key.tenant,
    },
    character_id: decoded.character_id,
    character_key: {
      item_id: String(decoded.character_key.item_id),
      tenant: decoded.character_key.tenant,
    },
    item_id: String(decoded.item_id),
    type_id: String(decoded.type_id),
    quantity: Number(decoded.quantity),
  }
}

export function inventoryEventBcsToParsedJson(
  decoded: DecodedInventoryMoveEvent,
): Record<string, unknown> {
  return {
    assembly_id: decoded.assembly_id,
    assembly_key: decoded.assembly_key,
    character_id: decoded.character_id,
    character_key: decoded.character_key,
    item_id: decoded.item_id,
    quantity: decoded.quantity,
    type_id: decoded.type_id,
  }
}
