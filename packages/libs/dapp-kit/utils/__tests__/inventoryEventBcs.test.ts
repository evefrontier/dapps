import { describe, expect, it } from 'vitest'

import { decodeInventoryEventBcsToJson } from '../events/inventoryEventBcs'

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
}

// Real ItemMintedEvent BCS bytes captured from testnet. Mint and burn share the
// InventoryMoveEvent struct, so this vector exercises the full decode path
// without a live RPC call.
const INVENTORY_MOVE_EVENT_BCS_HEX =
  '34d08b4e1afe6a4babcc0642d6a676160df6b777b49214d5c964b4e874cc951b7a2dc1d4e8000000097374696c6c6e657373a60609a1b94ffca8ed2daf4963a2b9deffce23de76ef9f3d040d7250edb7b2c781bee37d00000000097374696c6c6e6573730000000000000000f22f010000000000f4010000'

describe('inventoryEventBcs', () => {
  it('decodes an inventory move event from chain BCS bytes', () => {
    expect(
      decodeInventoryEventBcsToJson(hexToBytes(INVENTORY_MOVE_EVENT_BCS_HEX)),
    ).toEqual({
      assembly_id:
        '0x34d08b4e1afe6a4babcc0642d6a676160df6b777b49214d5c964b4e874cc951b',
      assembly_key: {
        item_id: '1000001842554',
        tenant: 'stillness',
      },
      character_id:
        '0xa60609a1b94ffca8ed2daf4963a2b9deffce23de76ef9f3d040d7250edb7b2c7',
      character_key: {
        item_id: '2112077441',
        tenant: 'stillness',
      },
      item_id: '0',
      quantity: 500,
      type_id: '77810',
    })
  })
})
