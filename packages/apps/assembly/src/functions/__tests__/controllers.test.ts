import type { EntityData } from '@evefrontier/dapp-kit'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@evefrontier/dapp-kit', () => ({
  Assemblies: { Assembly: 'Assembly' },
  createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}))

import { addController, removeController } from '../controllers'

const entity = { key: { id: '1000000070926', tenant: 'test' } } as EntityData

describe('controller transactions', () => {
  it('adds a character through the sponsored add action', async () => {
    const send = vi.fn().mockResolvedValue({ digest: '0xd1' })
    const result = await addController({
      entity,
      characterId: '0xc1',
      sendSponsoredTransaction: send,
    })

    expect(result).toEqual({ digest: '0xd1' })
    expect(send).toHaveBeenCalledWith({
      txAction: 'add-assembly-controller',
      assembly: { item_id: '1000000070926', type: 'Assembly' },
      metadata: { characterId: '0xc1' },
    })
  })

  it('removes a character through the sponsored remove action', async () => {
    const send = vi.fn().mockResolvedValue({ digest: '0xd2' })
    await removeController({
      entity,
      characterId: '0xc2',
      sendSponsoredTransaction: send,
    })

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ txAction: 'remove-assembly-controller' }),
    )
  })

  it('rethrows a failed transaction', async () => {
    const send = vi.fn().mockRejectedValue(new Error('No wallet connected'))
    await expect(
      addController({
        entity,
        characterId: '0xc1',
        sendSponsoredTransaction: send,
      }),
    ).rejects.toThrow('No wallet connected')
  })
})
