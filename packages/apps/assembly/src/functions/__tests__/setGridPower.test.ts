import type { EntityData } from '@evefrontier/dapp-kit'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@evefrontier/dapp-kit', () => ({
  Assemblies: { Assembly: 'Assembly' },
  createLogger: () => ({ info: vi.fn(), error: vi.fn() }),
}))

import { setGridPower } from '../setGridPower'

const entity = { key: { id: '1000000070926', tenant: 'test' } } as EntityData

describe('setGridPower', () => {
  it.each([true, false])('sends the main breaker setting %s', async (on) => {
    const send = vi.fn().mockResolvedValue({ digest: '0xd3' })
    const result = await setGridPower({
      entity,
      on,
      sendSponsoredTransaction: send,
    })

    expect(result).toEqual({ digest: '0xd3' })
    expect(send).toHaveBeenCalledWith({
      txAction: 'set-power-grid',
      assembly: { item_id: '1000000070926', type: 'Assembly' },
      metadata: { on },
    })
  })

  it('rethrows a failed transaction', async () => {
    const send = vi.fn().mockRejectedValue(new Error('Rejected'))
    await expect(
      setGridPower({ entity, on: false, sendSponsoredTransaction: send }),
    ).rejects.toThrow('Rejected')
  })
})
