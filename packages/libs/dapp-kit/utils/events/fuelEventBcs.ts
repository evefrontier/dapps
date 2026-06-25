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

// ----------------------------------------------------------------------------

export type DecodedFuelMoveEvent = {
  assembly_id: string
  assembly_key: { item_id: string; tenant: string }
  type_id: string
  old_quantity: string
  new_quantity: string
  is_burning: boolean
  action: unknown
}

export function decodeFuelEventBcs(bytes: Uint8Array): DecodedFuelMoveEvent {
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

export function fuelEventBcsToParsedJson(
  decoded: DecodedFuelMoveEvent,
): Record<string, unknown> {
  return {
    assembly_id: decoded.assembly_id,
    assembly_key: decoded.assembly_key,
    type_id: decoded.type_id,
    old_quantity: decoded.old_quantity,
    new_quantity: decoded.new_quantity,
    is_burning: decoded.is_burning,
    action: decoded.action,
  }
}
