import { bcs } from '@mysten/sui/bcs'

import { BcsObjectId, TenantKey } from './consts'

const BcsAction = bcs.enum('Action', {
  DEPOSITED: null,
  WITHDRAWN: null,
  BURNING_STARTED: null,
  BURNING_STOPPED: null,
  BURNING_UPDATED: null,
  DELETED: null,
})

const FuelMoveEvent = bcs.struct('FuelEvent', {
  assembly_id: BcsObjectId,
  assembly_key: TenantKey,
  type_id: bcs.u64(),
  old_quantity: bcs.u64(),
  new_quantity: bcs.u64(),
  is_burning: bcs.bool(),
  action: BcsAction,
})

export function decodeFuelEventBcsToJson(
  bytes: Uint8Array,
): Record<string, unknown> {
  const decoded = FuelMoveEvent.parse(bytes)
  return {
    assembly_id: decoded.assembly_id,
    assembly_key: {
      item_id: String(decoded.assembly_key.item_id),
      tenant: decoded.assembly_key.tenant,
    },
    type_id: String(decoded.type_id),
    old_quantity: String(decoded.old_quantity),
    new_quantity: String(decoded.new_quantity),
    is_burning: Boolean(decoded.is_burning),
    action: decoded.action,
  }
}
