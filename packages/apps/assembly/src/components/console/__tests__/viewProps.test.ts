import type {
  EntityData,
  EntityOwner,
  GridSummary,
} from '@evefrontier/dapp-kit'
import { describe, expect, it } from 'vitest'

import { toastData } from '../toastModel'
import { identityViewProps, shellLabel } from '../viewProps'

const entity = (metadata: EntityData['metadata']): EntityData =>
  ({ key: { id: '1000000070926', tenant: 'test' }, metadata }) as EntityData

const owner = (name: string, wallet = `0x${'a'.repeat(64)}`): EntityOwner =>
  ({
    walletAddress: wallet,
    character: { metadata: { name } },
  }) as unknown as EntityOwner

const summary = {
  status: 'online',
  modulesOnline: 2,
  modulesTotal: 3,
  drawMw: '20000',
  outputMw: '150000',
} as unknown as GridSummary

describe('shellLabel', () => {
  it("uses the shell's character name, else its wallet", () => {
    expect(shellLabel(owner('Oro'))).toBe('Oro')
    expect(shellLabel(owner(''))).toMatch(/^0xaaa\.\.\./)
    expect(shellLabel(null)).toBe('Unknown')
  })
})

describe('identityViewProps', () => {
  it('builds the code, name, lamp and rows', () => {
    const props = identityViewProps({
      entity: entity({
        name: 'Outpost Forge',
        description: 'Refining',
        url: 'example.com',
      }),
      owner: owner('Oro'),
      summary,
      controllerCount: 3,
    })
    expect(props.code).toBe('Assembly · 1000000070926')
    expect(props.name).toBe('Outpost Forge')
    expect(props.description).toBe('Refining')
    expect(props.lamp.state).toBe('on')
    expect(props.lamp.detail?.[0]).toBe('2 of 3 online')
    expect(props.rows).toEqual([
      { label: 'Shell', value: 'Oro' },
      { label: 'Controllers', value: '3' },
      { label: 'Dapp', value: 'example.com', href: 'https://example.com/' },
    ])
  })

  it('hides the controller count from visitors and handles no metadata or grid', () => {
    const props = identityViewProps({
      entity: entity(null),
      owner: null,
      summary: null,
      controllerCount: null,
    })
    expect(props.name).toBeNull()
    expect(props.description).toBeUndefined()
    expect(props.lamp).toEqual({ state: 'off', label: 'No grid' })
    expect(props.rows).toEqual([{ label: 'Shell', value: 'Unknown' }])
  })
})

describe('toastData', () => {
  it('gives Done its short hash and link', () => {
    expect(
      toastData(
        {
          kind: 'done',
          title: 'Details saved',
          digest: '8Kx2UeQhWv5nB3pRqm4T',
        },
        (digest) => `tx/${digest}`,
      ),
    ).toEqual({
      kind: 'done',
      title: 'Details saved',
      digest: '8Kx2…qm4T',
      href: 'tx/8Kx2UeQhWv5nB3pRqm4T',
    })
  })

  it('passes Sending and Failed through', () => {
    const failed = { kind: 'failed', title: 'x', detail: 'y' } as const
    expect(toastData(failed, () => '')).toBe(failed)
  })
})
