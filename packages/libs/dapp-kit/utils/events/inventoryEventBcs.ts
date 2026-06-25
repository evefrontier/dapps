import { bcs } from '@mysten/sui/bcs'

import { BcsObjectId, TenantKey } from './consts'

const InventoryMoveEvent = bcs.struct('InventoryMoveEvent', {
  assembly_id: BcsObjectId,
  assembly_key: TenantKey,
  character_id: BcsObjectId,
  character_key: TenantKey,
  item_id: bcs.u64(),
  type_id: bcs.u64(),
  quantity: bcs.u32(),
})

export function decodeInventoryEventBcsToJson(
  bytes: Uint8Array,
): Record<string, unknown> {
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
