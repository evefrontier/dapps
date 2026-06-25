import { describe, expect, it } from 'vitest'

import { decodeStatusChangedEventBcsToJson } from '../events/statusEventBcs'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

// Manually constructed StatusChangedEvent BCS bytes matching the on-chain Move struct:
//   assembly_id: 0x34d08b4e...cc951b (32 bytes)
//   assembly_key: { item_id: 1 (u64 LE), tenant: "stillness" }
//   status: ONLINE (variant index 2)
//   action: ANCHORED (variant index 0)
const STATUS_CHANGED_EVENT_BCS_HEX =
  '34d08b4e1afe6a4babcc0642d6a676160df6b777b49214d5c964b4e874cc951b' +
  '0100000000000000' +
  '09' +
  '7374696c6c6e657373' +
  '02' +
  '00'

describe('statusEventBcs', () => {
  it('decodes a StatusChangedEvent from BCS bytes', () => {
    expect(
      decodeStatusChangedEventBcsToJson(
        hexToBytes(STATUS_CHANGED_EVENT_BCS_HEX),
      ),
    ).toMatchObject({
      assembly_id:
        '0x34d08b4e1afe6a4babcc0642d6a676160df6b777b49214d5c964b4e874cc951b',
      assembly_key: {
        item_id: '1',
        tenant: 'stillness',
      },
    })
  })

  it('decodes the status variant kind', () => {
    const json = decodeStatusChangedEventBcsToJson(
      hexToBytes(STATUS_CHANGED_EVENT_BCS_HEX),
    )
    // bcs.enum returns a discriminated union: { $kind: '<Variant>', <Variant>: true }
    expect((json['status'] as Record<string, unknown>)?.['$kind']).toBe(
      'ONLINE',
    )
  })

  it('decodes the action variant kind', () => {
    const json = decodeStatusChangedEventBcsToJson(
      hexToBytes(STATUS_CHANGED_EVENT_BCS_HEX),
    )
    expect((json['action'] as Record<string, unknown>)?.['$kind']).toBe(
      'ANCHORED',
    )
  })

  it('throws on malformed BCS bytes', () => {
    expect(() =>
      decodeStatusChangedEventBcsToJson(new Uint8Array([0x00, 0x01])),
    ).toThrow()
  })
})
