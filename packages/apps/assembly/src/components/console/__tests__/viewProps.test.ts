import type {
  EntityData,
  EntityInventory,
  EntityOwner,
  EntityPowerGrid,
  GridSummary,
} from '@evefrontier/dapp-kit'
import { describe, expect, it } from 'vitest'
import type { AirlockRow, BoardSection } from '../model'
import { toastData } from '../toastModel'
import {
  airlockCards,
  boardSections,
  fuelPanel,
  gridBanner,
  gridReadouts,
  identityViewProps,
  shellLabel,
} from '../viewProps'

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

const grid = (on = true): EntityPowerGrid =>
  ({
    on,
    lastSettledMs: '0',
    fuelSources: {
      '0x00000000000000000000000000000000000000000000000000000000000abc12':
        '5000000',
    },
  }) as unknown as EntityPowerGrid

const fuelSummary = (overrides: Partial<GridSummary> = {}): GridSummary =>
  ({
    status: 'online',
    reason: null,
    outputMw: 150000n,
    drawMw: 30000n,
    headroomMw: 120000n,
    fuelFraction: 0.5,
    fuelNow: 5000000n,
    fuelSettled: 5000000n,
    fuelCapacity: 10000000n,
    msUntilEmpty: 2 * 3600000,
    ...overrides,
  }) as unknown as GridSummary

describe('gridReadouts', () => {
  it('formats the readouts and works out the gauge', () => {
    const readouts = gridReadouts(fuelSummary())
    expect(readouts.gaugePercent).toBe(20)
    expect(gridReadouts(fuelSummary({ outputMw: 0n })).gaugePercent).toBe(0)
  })
})

describe('gridBanner', () => {
  it('says the power is off first', () => {
    expect(gridBanner(fuelSummary({ status: 'off' }))?.title).toBe('Power off')
  })

  it('explains a no-power reason that has a body', () => {
    const banner = gridBanner(
      fuelSummary({ status: 'noPower', reason: 'outOfFuel' }),
    )
    expect(banner).toMatchObject({
      tone: 'amber',
      title: 'No power · out of fuel',
    })
  })

  it('warns when fuel is low, and is quiet otherwise', () => {
    expect(gridBanner(fuelSummary({ fuelFraction: 0.05 }))?.title).toMatch(
      /^Fuel low · ≈ /,
    )
    expect(gridBanner(fuelSummary())).toBeNull()
  })
})

describe('fuelPanel', () => {
  it('estimates what is left while burning', () => {
    const fuel = fuelPanel(grid(), fuelSummary(), 60000)
    expect(typeof fuel.estimate).toBe('object')
    expect(fuel.low).toBe(false)
    expect(fuel.sources).toHaveLength(1)
    expect(fuel.sources[0]?.label).toMatch(/^Fuel #/)
  })

  it('says why it is not burning', () => {
    expect(
      fuelPanel(grid(), fuelSummary({ fuelNow: 0n, msUntilEmpty: null }), 0)
        .estimate,
    ).toBe('Empty')
    expect(
      fuelPanel(grid(false), fuelSummary({ msUntilEmpty: null }), 0).estimate,
    ).toBe('Not burning · main breaker off')
  })
})

describe('boardSections', () => {
  it('names cards from Datahub, else their fallback', () => {
    const board = [
      {
        id: 's1',
        name: 'Section 1',
        code: '#1',
        drawMw: 1000n,
        cards: [
          {
            componentId: 'c1',
            code: '#c1',
            kind: 'module',
            typeId: '77',
            fallbackName: 'Module',
            lamp: 'on',
            statusLabel: 'Online',
            detail: null,
            spec: { label: 'Firm', value: 'needs 0.1 MW' },
            draw: 1000n,
          },
          {
            componentId: 'c2',
            code: '#c2',
            kind: 'other',
            typeId: null,
            fallbackName: 'Part',
            lamp: null,
            statusLabel: 'No breaker',
            detail: null,
            spec: { label: '', value: '' },
            draw: 0n,
          },
        ],
      },
    ] as BoardSection[]
    const [section] = boardSections(board, { '77': 'Refinery' })
    expect(section?.cards.map((card) => card.name)).toEqual([
      'Refinery',
      'Part',
    ])
    expect(section?.cards[1]?.lamp).toBeNull()
  })
})

describe('airlockCards', () => {
  const airlocks = [
    {
      componentId: 'a1',
      code: '#a1',
      typeId: '88',
      sectionName: 'Section 1',
      inventory: {
        name: 'Storage',
        capacity: '1000',
        used: '250',
        items: [{ typeId: '99', quantity: '2', volume: '10' }],
      } as unknown as EntityInventory,
    },
  ] as AirlockRow[]

  it('shows how full each airlock is and hides the contents from visitors', () => {
    const [card] = airlockCards(airlocks, {}, false)
    expect(card).toMatchObject({ name: 'Storage', fraction: 0.25 })
    expect(card?.items).toBeUndefined()
  })

  it('lists the contents for the shell and controllers', () => {
    const [card] = airlockCards(airlocks, { '99': 'Ore' }, true)
    expect(card?.items?.[0]).toMatchObject({ name: 'Ore', quantity: '2' })
  })
})
