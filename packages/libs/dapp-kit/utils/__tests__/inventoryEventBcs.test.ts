import {
  getJsonRpcFullnodeUrl,
  JsonRpcHTTPTransport,
} from '@mysten/sui/jsonRpc'
import { fromBase64 } from '@mysten/sui/utils'
import { describe, expect, it } from 'vitest'

import {
  decodeInventoryEventBcs,
  inventoryEventBcsToParsedJson,
} from '../inventoryEventBcs'

const PACKAGE_ID =
  '0x28b497559d65ab320d9da4613bf2498d5946b2c0ae3597ccfda3072ce127448c'

describe('inventoryEventBcs', () => {
  it('decodes mint and burn inventory events from chain BCS bytes', async () => {
    const transport = new JsonRpcHTTPTransport({
      url: getJsonRpcFullnodeUrl('testnet'),
    })

    for (const eventName of ['ItemMintedEvent', 'ItemBurnedEvent'] as const) {
      const result = await transport.request<{
        data: Array<{
          parsedJson: Record<string, unknown>
          bcs: string
          bcsEncoding: 'base64' | 'base58'
        }>
      }>({
        method: 'suix_queryEvents',
        params: [
          { MoveEventType: `${PACKAGE_ID}::inventory::${eventName}` },
          null,
          1,
          true,
        ],
      })

      const event = result.data[0]
      if (!event) {
        throw new Error(`No ${eventName} events returned from testnet`)
      }
      const bytes = fromBase64(event.bcs)
      const decoded = decodeInventoryEventBcs(bytes)

      expect(inventoryEventBcsToParsedJson(decoded)).toEqual(event.parsedJson)
    }
  })
})
