import { describe, expect, it } from 'vitest'

import {
  decodeFuelEventBcs,
  fuelEventBcsToParsedJson,
} from '../events/fuelEventBcs'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

// Manually constructed FuelEvent BCS bytes matching the on-chain Move struct:
//   assembly_id: 0x34d08b4e...cc951b (32 bytes)
//   assembly_key: { item_id: 1 (u64 LE), tenant: "stillness" }
//   type_id: 77810, old_quantity: 10, new_quantity: 5
//   is_burning: false, action: WITHDRAWN (variant index 1)
const FUEL_EVENT_BCS_HEX =
  '34d08b4e1afe6a4babcc0642d6a676160df6b777b49214d5c964b4e874cc951b' +
  '0100000000000000' +
  '09' +
  '7374696c6c6e657373' +
  'f22f010000000000' +
  '0a00000000000000' +
  '0500000000000000' +
  '00' +
  '01'

describe('fuelEventBcs', () => {
  it('decodes a FuelEvent from BCS bytes', () => {
    const decoded = decodeFuelEventBcs(hexToBytes(FUEL_EVENT_BCS_HEX))

    expect(fuelEventBcsToParsedJson(decoded)).toMatchObject({
      assembly_id:
        '0x34d08b4e1afe6a4babcc0642d6a676160df6b777b49214d5c964b4e874cc951b',
      assembly_key: {
        item_id: '1',
        tenant: 'stillness',
      },
      type_id: '77810',
      old_quantity: '10',
      new_quantity: '5',
      is_burning: false,
    })
  })

  it('decodes the action variant kind', () => {
    const decoded = decodeFuelEventBcs(hexToBytes(FUEL_EVENT_BCS_HEX))
    const json = fuelEventBcsToParsedJson(decoded)
    // bcs.enum returns a discriminated union: { $kind: '<Variant>', <Variant>: true }
    expect((json.action as Record<string, unknown>)?.$kind).toBe('WITHDRAWN')
  })

  it('throws on malformed BCS bytes', () => {
    expect(() => decodeFuelEventBcs(new Uint8Array([0x00, 0x01]))).toThrow()
  })
})
