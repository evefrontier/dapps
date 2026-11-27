import type {
  CharacterSummary,
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
  accessRows,
  airlockCards,
  boardSections,
  candidates,
  consoleNote,
  fuelPanel,
  gridBanner,
  gridReadouts,
  identityViewProps,
  roleChip,
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

/** A pools grid: one 1_000 kg bay of fuel at impulse 90. */
const grid = (on = true): EntityPowerGrid =>
  ({
    model: 'pools',
    on,
    lastSettledMs: '0',
    fuelImpulse: '90000000000',
    fuelSources: {
      '0x00000000000000000000000000000000000000000000000000000000000abc12':
        '1000000000000',
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
    // 40 kg/h at 3 MW
    fuelBurnPerHour: 400000n,
    fuelUnit: 'kg',
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
  it('shows the burn, the draw burning it and how long it runs', () => {
    const fuel = fuelPanel(grid(), fuelSummary(), 60000)
    expect(fuel.amount).toBe('≈ 500.00')
    expect(fuel.capacity).toBe('1,000.00')
    expect(fuel.unit).toBe('kg')
    expect(fuel.burn).toEqual({
      burning: true,
      rate: '40.0',
      rateUnit: 'kg/h',
      drawMw: '3',
      runsFor: '2 h 00 m',
    })
    // 40 kg/h over 3 MW
    expect(fuel.burnNote).toBe('≈ 13.3 kg per MW-hour at impulse 90')
    expect(fuel.low).toBe(false)
    expect(fuel.sources).toEqual([
      {
        id: '0x00000000000000000000000000000000000000000000000000000000000abc12',
        label: 'Fuel #0abc12',
        units: '1,000.00 kg',
      },
    ])
  })

  it('shows no burn and says why while nothing burns', () => {
    const idle = { fuelBurnPerHour: 0n, msUntilEmpty: null }
    const note = (g: EntityPowerGrid, s: Partial<GridSummary>) =>
      fuelPanel(g, fuelSummary(s), 0).burnNote
    expect(fuelPanel(grid(false), fuelSummary(idle), 0).burn).toEqual({
      burning: false,
      rate: '0.0',
      rateUnit: 'kg/h',
      drawMw: '0',
      runsFor: '—',
    })
    expect(note(grid(), { ...idle, fuelNow: 0n })).toBe(
      'Empty: nothing left to burn',
    )
    expect(note(grid(false), idle)).toBe('Not burning · main breaker off')
    expect(note(grid(), { ...idle, status: 'off' })).toBe(
      'Not burning · main breaker off',
    )
    expect(
      note(grid(), { ...idle, status: 'noPower', reason: 'generatorOff' }),
    ).toBe('Not burning · no generator running')
    expect(note(grid(), { ...idle, drawMw: 0n })).toBe(
      'Not burning · nothing draws power',
    )
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

  it('shows how full each airlock is and what it holds', () => {
    const [card] = airlockCards(airlocks, { '99': 'Ore' })
    expect(card).toMatchObject({ name: 'Storage', fraction: 0.25 })
    expect(card?.items).toEqual([
      { id: '99', name: 'Ore', quantity: '2', volume: '0.2' },
    ])
  })

  it('names an item by its type id until its name loads', () => {
    const [card] = airlockCards(airlocks, {})
    expect(card?.items[0]?.name).toBe('Type 99')
  })
})

const id = (digit: string) => `0x${digit.repeat(64)}`

describe('accessRows', () => {
  const rows = [
    {
      key: 'c1',
      characterId: id('1'),
      name: 'Oro',
      address: id('a'),
      isShell: false,
    },
    {
      key: 'shell',
      characterId: id('2'),
      name: '',
      address: null,
      isShell: true,
    },
  ]

  it('gives every row but the shell a Remove, with its label', () => {
    const removed: string[] = []
    const out = accessRows(rows, {
      viewerId: id('1'),
      role: 'controller',
      onRemove: (_, label) => removed.push(label),
    })
    out[0]?.onRemove?.()
    expect(removed).toEqual(['Oro'])
    expect(out[1]?.onRemove).toBeUndefined()
    expect(out[1]?.name).toBe('Unknown character')
  })

  it('marks You on the viewer, or on the shell row for the shell', () => {
    const asController = accessRows(rows, {
      viewerId: id('1'),
      role: 'controller',
      onRemove: () => {},
    })
    expect(asController.map((row) => row.isYou)).toEqual([true, false])
    const asShell = accessRows(rows, {
      viewerId: null,
      role: 'shell',
      onRemove: () => {},
    })
    expect(asShell.map((row) => row.isYou)).toEqual([false, true])
  })
})

describe('candidates', () => {
  const character = (digit: string, name: string): CharacterSummary =>
    ({
      characterId: id(digit),
      name,
      walletAddress: id('f'),
    }) as CharacterSummary

  it('tags the shell and existing controllers', () => {
    const out = candidates(
      [character('1', 'Oro'), character('2', ''), character('3', 'Vex')],
      { controllers: [id('2')], shellId: id('1'), onPick: () => {} },
    )
    expect(out.map((candidate) => candidate.tag)).toEqual([
      'Shell',
      'Controller',
      undefined,
    ])
    expect(out[1]?.name).toBe('Unnamed character')
  })
})

describe('roleChip', () => {
  it('labels the role, a visitor and a preview', () => {
    expect(
      roleChip({ role: 'shell', preview: false, connected: true }),
    ).toEqual({
      role: 'shell',
      label: 'shell',
    })
    expect(
      roleChip({ role: 'visitor', preview: false, connected: true })?.label,
    ).toBe('Visitor · read only')
    expect(
      roleChip({ role: 'controller', preview: true, connected: false })?.label,
    ).toBe('controller · preview')
    expect(
      roleChip({ role: 'visitor', preview: false, connected: false }),
    ).toBeNull()
  })
})

describe('roleChip while loading', () => {
  it('stays neutral while the role loads, unless a preview is forced', () => {
    expect(
      roleChip({
        role: 'visitor',
        preview: false,
        loading: true,
        connected: true,
      }),
    ).toEqual({ role: '', label: 'Checking access…' })
    expect(
      roleChip({ role: 'shell', preview: true, loading: true, connected: true })
        ?.label,
    ).toBe('shell · preview')
  })
})

describe('consoleNote', () => {
  it('says why there is nothing to show', () => {
    expect(consoleNote({ loading: true, error: null })).toBe(
      'Reading the Assembly…',
    )
    expect(consoleNote({ loading: false, error: 'boom' })).toBe(
      'Could not read the Assembly: boom',
    )
    expect(consoleNote({ loading: false, error: null })).toMatch(/^No Assembly/)
  })
})
