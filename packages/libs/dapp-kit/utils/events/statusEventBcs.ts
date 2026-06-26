import { bcs } from '@mysten/sui/bcs'

import { BcsObjectId, TenantKey } from './consts'

const BcsStatus = bcs.enum('AssemblyStatus', {
  NULL: null,
  OFFLINE: null,
  ONLINE: null,
})

const BcsStatusAction = bcs.enum('AssemblyStatusAction', {
  ANCHORED: null,
  ONLINE: null,
  OFFLINE: null,
  UNANCHORED: null,
})

const StatusChangedMoveEvent = bcs.struct('StatusChangedEvent', {
  assembly_id: BcsObjectId,
  assembly_key: TenantKey,
  status: BcsStatus,
  action: BcsStatusAction,
})

export function decodeStatusChangedEventBcsToJson(
  bytes: Uint8Array,
): Record<string, unknown> {
  const decoded = StatusChangedMoveEvent.parse(bytes)
  return {
    assembly_id: decoded.assembly_id,
    assembly_key: {
      item_id: String(decoded.assembly_key.item_id),
      tenant: decoded.assembly_key.tenant,
    },
    status: decoded.status,
    action: decoded.action,
  }
}
