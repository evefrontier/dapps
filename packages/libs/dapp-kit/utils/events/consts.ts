import { bcs } from '@mysten/sui/bcs'

export const BcsObjectId = bcs.fixedArray(32, bcs.u8()).transform({
  input: (value: number[]) => value,
  output: (value: number[]) =>
    `0x${value.map((byte) => byte.toString(16).padStart(2, '0')).join('')}`,
})

export const TenantKey = bcs.struct('TenantKey', {
  item_id: bcs.u64(),
  tenant: bcs.string(),
})
