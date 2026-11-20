import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EntityPowerGrid, EntityPowerModule } from '../../types'
import { fetchEntity, parseEntity } from '../entity'
import { generatorStates, gridSummary, moduleStates } from '../grid'
import testnetEntity from './fixtures/entity.testnet.json'

const firm = (
  powerReq: string,
  activeDraw: string,
  desiredOnline = true,
): EntityPowerModule => ({
  desiredOnline,
  activeDraw,
  powerReq,
  drawKind: 'Firm',
})
const elastic = (powerReq: string, activeDraw: string): EntityPowerModule => ({
  desiredOnline: true,
  activeDraw,
  powerReq,
  drawKind: 'Elastic',
})

/** 15 MW generator on, base-rate burn (no impulse), lots of fuel, settled at 0. */
function grid(
  modules: Record<string, EntityPowerModule>,
  overrides: Partial<EntityPowerGrid> = {},
): EntityPowerGrid {
  return {
    on: true,
    fuelQuantity: '10000000',
    fuelCapacity: '10000000',
    capacityMw: '150000',
    lastSettledMs: '0',
    fuelImpulse: '0',
    fuelContainmentBurden: '0',
    modules,
    generators: {
      g1: {
        online: true,
        maxOutputMw: '150000',
        containmentReduction: '100000',
        baseFuelRate: '10000',
      },
    },
    fuelSources: { f1: '10000000' },
    ...overrides,
  }
}

const statuses = (g: EntityPowerGrid, nowMs = 0) =>
  moduleStates(g, nowMs).map((m) => [m.componentId, m.status, m.reason])

describe('moduleStates', () => {
  it('marks granted, reduced and switched-off modules', () => {
    const g = grid({
      a: firm('100000', '100000'),
      b: elastic('120000', '50000'),
      c: firm('20000', '0', false),
      d: firm('0', '0'),
    })
    expect(statuses(g)).toEqual([
      ['a', 'online', null],
      ['b', 'reduced', null],
      ['c', 'off', null],
      ['d', 'online', null],
    ])
  })

  it('blames the Firm rule when switched-on modules get nothing', () => {
    // 20 MW of Firm demand on a 15 MW grid: regrant gives every module 0
    const g = grid({ a: firm('100000', '0'), b: firm('100000', '0') })
    expect(statuses(g)).toEqual([
      ['a', 'blocked', 'notEnoughPower'],
      ['b', 'blocked', 'notEnoughPower'],
    ])
  })

  it('keeps switched-on modules as main off while the breaker is open', () => {
    const g = grid(
      { a: firm('100000', '0'), b: firm('100000', '0', false) },
      { on: false },
    )
    expect(statuses(g)).toEqual([
      ['a', 'mainOff', 'mainOff'],
      ['b', 'off', null],
    ])
  })

  it('reports no generator running', () => {
    const g = grid({ a: firm('100000', '0') }, { capacityMw: '0' })
    expect(statuses(g)).toEqual([['a', 'blocked', 'generatorOff']])
  })

  it('reads draw as 0 once the projected fuel has run out', () => {
    // 1 unit/s base burn; 2 units of fuel are gone after 2 s
    const g = grid({ a: firm('100000', '100000') }, { fuelQuantity: '20000' })
    expect(moduleStates(g, 1_000)[0]).toMatchObject({
      status: 'online',
      draw: 100_000n,
    })
    expect(moduleStates(g, 2_000)[0]).toMatchObject({
      status: 'blocked',
      reason: 'outOfFuel',
      draw: 0n,
    })
  })
})

describe('generatorStates', () => {
  it('reports running, off, main off and stopped', () => {
    const generator = {
      online: true,
      maxOutputMw: '150000',
      containmentReduction: '100000',
      baseFuelRate: '10000',
    }
    const g = grid(
      { a: firm('100000', '100000') },
      {
        fuelQuantity: '20000',
        generators: { g1: generator, g2: { ...generator, online: false } },
      },
    )
    expect(generatorStates(g, 0).map((s) => s.status)).toEqual([
      'running',
      'off',
    ])
    expect(generatorStates({ ...g, on: false }, 0)[0]?.status).toBe('mainOff')
    expect(generatorStates(g, 2_000)[0]?.status).toBe('stopped')
  })
})

describe('gridSummary', () => {
  it('sums output, draw, headroom and modules online', () => {
    const g = grid({
      a: firm('100000', '100000'),
      b: elastic('120000', '50000'),
      c: firm('20000', '0', false),
    })
    expect(gridSummary(g, 0)).toMatchObject({
      status: 'online',
      reason: null,
      outputMw: 150_000n,
      drawMw: 150_000n,
      headroomMw: 0n,
      modulesOnline: 2,
      modulesTotal: 3,
    })
  })

  it('projects fuel now and time left', () => {
    // base rate 1 unit/s: 3600 units an hour from 1000 units
    const g = grid({ a: firm('100000', '100000') })
    const summary = gridSummary(g, 60_000)
    expect(summary.fuelSettled).toBe(10_000_000n)
    expect(summary.fuelNow).toBe(10_000_000n - 600_000n)
    expect(summary.fuelBurnPerHour).toBe(36_000_000n)
    expect(summary.msUntilEmpty).toBe(940_000)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('reads the testnet entity as switched off', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: () => Promise.resolve(testnetEntity),
      })),
    )
    const raw = await fetchEntity('0x08c7')
    const g = parseEntity(raw!).powerGrid!
    expect(gridSummary(g, Number(g.lastSettledMs) + 60_000)).toMatchObject({
      status: 'off',
      reason: 'mainOff',
      outputMw: 0n,
      drawMw: 0n,
      modulesOnline: 0,
      modulesTotal: 6,
      fuelNow: 0n,
      fuelBurnPerHour: 0n,
      msUntilEmpty: null,
    })
    expect(moduleStates(g, 0).every((m) => m.status === 'off')).toBe(true)
  })
})
