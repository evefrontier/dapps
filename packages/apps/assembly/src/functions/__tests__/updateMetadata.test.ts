import type { EntityData } from '@evefrontier/dapp-kit'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@evefrontier/dapp-kit', () => ({
  Assemblies: { Assembly: 'Assembly' },
  SponsoredTransactionActions: { UPDATE_METADATA: 'update-metadata' },
  createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}))

import { updateMetadata } from '../updateMetadata'

const entity = { key: { id: '1000000070926', tenant: 'test' } } as EntityData
const details = {
  name: 'Halcyon Anchor',
  description: 'Forward refuelling post',
  url: '',
}

describe('updateMetadata', () => {
  it('sends all three details in one update-metadata action', async () => {
    const send = vi.fn().mockResolvedValue({ digest: '0xd4' })
    const result = await updateMetadata({
      entity,
      details,
      sendSponsoredTransaction: send,
    })

    expect(result).toEqual({ digest: '0xd4' })
    expect(send).toHaveBeenCalledWith({
      txAction: 'update-metadata',
      assembly: { item_id: '1000000070926', type: 'Assembly' },
      metadata: details,
    })
  })

  it('rethrows a failed transaction', async () => {
    const send = vi.fn().mockRejectedValue(new Error('Rejected'))
    await expect(
      updateMetadata({ entity, details, sendSponsoredTransaction: send }),
    ).rejects.toThrow('Rejected')
  })
})
