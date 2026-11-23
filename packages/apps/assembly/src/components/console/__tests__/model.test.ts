import type {
  EntityData,
  EntityPowerModule,
  GridSummary,
} from '@evefrontier/dapp-kit'
import { describe, expect, it } from 'vitest'

import {
  buildAirlocks,
  buildBoard,
  consoleTabs,
  gridLamp,
  NO_POWER_LABEL,
} from '../model'

const powerModule = (
  overrides: Partial<EntityPowerModule> = {},
): EntityPowerModule => ({
  desiredOnline: true,
  activeDraw: '1000',
  powerReq: '1000',
  drawKind: 'Firm',
  priority: '0',
  lineLoss: '0',
  ...overrides,
})

/**
 * A grid that is on with plenty of fuel and a 15 MW generator, laid out in
 * two sections. Section 2 also holds a component with no breaker; the grid
 * holds one module that is in no section.
 */
function entity(overrides: Partial<EntityData> = {}): EntityData {
  return {
    id: '0xe',
    version: 1,
    key: { id: '1000000070926', tenant: 'test' },
    accessCapId: '0xcap',
    inFlight: false,
    metadata: null,
    identity: null,
    powerGrid: {
      on: true,
      fuelQuantity: '10000000',
      fuelCapacity: '10000000',
      capacityMw: '150000',
      lastSettledMs: '0',
      fuelImpulse: '0',
      fuelContainmentBurden: '0',
      modules: {
        '1000000000010': powerModule(),
        '1000000000011': powerModule({
          drawKind: 'Elastic',
          powerReq: '120000',
          activeDraw: '50000',
        }),
        '1000000000012': powerModule({ desiredOnline: false, activeDraw: '0' }),
        '1000000000099': powerModule({ activeDraw: '0', powerReq: '0' }),
      },
      generators: {
        '1000000000001': {
          online: true,
          maxOutputMw: '150000',
          containmentReduction: '100000',
          baseFuelRate: '10000',
        },
      },
      fuelSources: { '1000000000002': '10000000' },
    },
    layout: {
      shellId: null,
      sections: [
        {
          id: '1000000000100',
          moduleIds: ['1000000000001', '1000000000002', '1000000000010'],
        },
        {
          id: '1000000000200',
          moduleIds: ['1000000000011', '1000000000012', '1000000000050'],
        },
      ],
    },
    inventories: [
      {
        componentId: '1000000000012',
        name: null,
        typeId: '98662',
        capacity: '100000',
        used: '0',
        items: [],
      },
    ],
    genericModules: [
      { componentId: '1000000000010', name: null, typeId: '95315' },
      { componentId: '1000000000011', name: null, typeId: '95352' },
    ],
    controllers: null,
    components: [
      {
        id: '1000000000050',
        name: null,
        kind: 'shell::Hatch',
        type: '0x1::component::Component<0x1::shell::Hatch>',
        json: {},
      },
    ],
    adminActions: [],
    ownerActions: [],
    actions: [],
    ...overrides,
  }
}

const cardsOf = (board: ReturnType<typeof buildBoard>) =>
  Object.fromEntries(
    board.flatMap((s) => s.cards.map((c) => [c.componentId.slice(-3), c])),
  )

describe('buildBoard', () => {
  it('lays out sections in order, then unplaced grid parts, then parts with no breaker', () => {
    const board = buildBoard(entity(), 0)
    expect(board.map((s) => [s.name, s.cards.map((c) => c.code)])).toEqual([
      ['Section 1', ['#000001', '#000002', '#000010']],
      ['Section 2', ['#000011', '#000012']],
      ['Not in a section', ['#000099']],
      ['No breaker', ['#000050']],
    ])
  })

  it('sums each section’s live draw', () => {
    const board = buildBoard(entity(), 0)
    expect(board[0]!.drawMw).toBe(1000n)
    expect(board[1]!.drawMw).toBe(50000n)
  })

  it('shows a fuel source as Idle while nothing burns it', () => {
    const off = entity()
    off.powerGrid = { ...off.powerGrid!, on: false }
    expect(cardsOf(buildBoard(off, 0))['002']).toMatchObject({
      kind: 'fuel',
      lamp: 'off',
      statusLabel: 'Idle',
    })
  })

  it('says what each card draws, makes or holds', () => {
    const cards = cardsOf(buildBoard(entity(), 0))
    expect(cards['001']).toMatchObject({
      kind: 'generator',
      lamp: 'on',
      statusLabel: 'Running',
      detail: 'Making 15 MW',
      spec: { label: 'Output', value: '15 MW' },
    })
    expect(cards['002']).toMatchObject({
      kind: 'fuel',
      lamp: 'on',
      statusLabel: 'Feeding',
      spec: { label: 'Holds', value: '1,000 units' },
    })
    expect(cards['010']).toMatchObject({
      kind: 'module',
      typeId: '95315',
      statusLabel: 'Online',
      detail: '0.1 MW drawn',
      spec: { label: 'Firm', value: 'needs 0.1 MW' },
    })
    expect(cards['011']).toMatchObject({
      statusLabel: 'Reduced',
      detail: '5 of 12 MW',
      spec: { label: 'Elastic', value: 'needs 12 MW' },
    })
    expect(cards['012']).toMatchObject({
      kind: 'airlock',
      lamp: 'off',
      statusLabel: 'Off',
      detail: 'Switched off',
    })
    expect(cards['050']).toMatchObject({
      kind: 'other',
      lamp: null,
      statusLabel: 'No breaker',
      fallbackName: 'shell::Hatch',
    })
  })

  it('gives the reason a switched-on module has no power', () => {
    const e = entity()
    e.powerGrid!.on = false
    const cards = cardsOf(buildBoard(e, 0))
    expect(cards['010']).toMatchObject({
      lamp: 'main',
      statusLabel: 'Main off',
      detail: NO_POWER_LABEL.mainOff,
    })
    expect(cards['001']).toMatchObject({
      lamp: 'main',
      detail: NO_POWER_LABEL.mainOff,
    })
  })

  it('names the only column Modules when there is no layout', () => {
    const board = buildBoard(entity({ layout: null }), 0)
    expect(board.map((s) => s.name)).toEqual(['Modules'])
  })
})

describe('buildAirlocks', () => {
  it('lists each airlock with its section', () => {
    expect(buildAirlocks(entity())).toMatchObject([
      { code: '#000012', typeId: '98662', sectionName: 'Section 2' },
    ])
  })
})

describe('gridLamp', () => {
  const summary = (status: GridSummary['status']) => ({ status }) as GridSummary

  it('maps the grid status to the big lamp', () => {
    expect(gridLamp(summary('online'))).toEqual({ lamp: 'on', label: 'Online' })
    expect(gridLamp(summary('off'))).toEqual({
      lamp: 'main',
      label: 'Power off',
    })
    expect(gridLamp(summary('noPower'))).toEqual({
      lamp: 'wait',
      label: 'No power',
    })
    expect(gridLamp(null)).toEqual({ lamp: 'off', label: 'No grid' })
  })
})

describe('consoleTabs', () => {
  const base = {
    hasDapp: false,
    forceDapp: false,
    hasInventory: false,
    writer: false,
  }

  it('leaves out Dapp when there is no URL and it is not forced', () => {
    expect(consoleTabs(base)).toEqual(['grid'])
  })

  it('puts Dapp first when forced, even with no URL', () => {
    expect(consoleTabs({ ...base, forceDapp: true })).toEqual(['dapp', 'grid'])
  })

  it('shows Dapp for a URL whether forced or not', () => {
    expect(consoleTabs({ ...base, hasDapp: true })).toEqual(['dapp', 'grid'])
    expect(consoleTabs({ ...base, hasDapp: true, forceDapp: true })).toEqual([
      'dapp',
      'grid',
    ])
  })

  it('adds Airlock for an inventory and Access for a writer', () => {
    expect(
      consoleTabs({ ...base, hasDapp: true, hasInventory: true, writer: true }),
    ).toEqual(['dapp', 'grid', 'airlock', 'access'])
  })
})
