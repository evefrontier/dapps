import { describe, expect, it } from 'vitest'
import type { EntityPowerGrid } from '../../types'
import {
  effectiveCapacityMw,
  fromFixed,
  fuelBurn,
  fuelBurnPerHour,
  fuelFactor,
  generatorBurn,
  msUntilEmpty,
  projectedFuel,
  usedMw,
} from '../fuel'

// Expected numbers are the world-contracts power tests (dev, d87ebc1):
// fuel_math.move and tests/fuel_tests.move, with grid_scenario's constants.
const STARTING_FUEL = '500000000'
const IMPULSE = '900000' // 90
const BURDEN = '140000' // 14

/** fuel_tests `loaded`: one 15 MW generator (reduction 10), one 10 MW Firm module on. */
function loadedGrid(overrides: Partial<EntityPowerGrid> = {}): EntityPowerGrid {
  return {
    on: true,
    fuelQuantity: STARTING_FUEL,
    fuelCapacity: '1000000000',
    capacityMw: '150000',
    lastSettledMs: '0',
    fuelImpulse: IMPULSE,
    fuelContainmentBurden: BURDEN,
    modules: {
      '401': {
        desiredOnline: true,
        activeDraw: '100000',
        powerReq: '100000',
        drawKind: 'Firm',
      },
    },
    generators: {
      '101': {
        online: true,
        maxOutputMw: '150000',
        containmentReduction: '100000',
        baseFuelRate: '10000',
      },
    },
    fuelSources: { '9001': '1000000000' },
    ...overrides,
  }
}

describe('fuelFactor', () => {
  it('matches the game client (fuel_factor_matches_client)', () => {
    expect(fuelFactor(900_000n, 140_000n, 100_000n)).toBe(642_857n)
    expect(fuelFactor(100_000n, 30_000n, 100_000n)).toBe(100_000n)
    expect(fuelFactor(4_000n, 30_000n, 100_000n)).toBe(10_000n)
    expect(fuelFactor(2_000_000n, 30_000n, 100_000n)).toBe(1_000_000n)
    expect(fuelFactor(900_000n, 140_000n, 0n)).toBe(64_285n)
  })
})

describe('generatorBurn', () => {
  it('still burns a fractional share (fractional_generator_share_still_burns)', () => {
    const burn = (elapsedMs: bigint) =>
      generatorBurn({
        impulse: 10_000n,
        containmentBurden: 10_000n,
        capacityMw: 2n,
        maxOutputMw: 1n,
        containmentReduction: 10_000n,
        baseFuelRate: 0n,
        load: 1n,
        elapsedMs,
      })
    expect(burn(1_000n)).toBe(1n)
    expect(burn(2_000n)).toBe(1n)
    expect(burn(3_000n)).toBe(2n)
  })

  it('burns the base rate when there is no fuel impulse', () => {
    expect(
      generatorBurn({
        impulse: 0n,
        containmentBurden: 0n,
        capacityMw: 150_000n,
        maxOutputMw: 150_000n,
        containmentReduction: 100_000n,
        baseFuelRate: 10_000n,
        load: 1_000n,
        elapsedMs: 1_500n,
      }),
    ).toBe(15_000n)
  })
})

describe('fuelBurn', () => {
  it('burns 15_556 over 10 s at 10 MW (burn_over_time_and_view_matches_settle)', () => {
    const grid = loadedGrid()
    expect(fuelBurn(grid, 10_000)).toBe(15_556n)
    expect(projectedFuel(grid, 10_000)).toBe(500_000_000n - 15_556n)
  })

  it('rounds up per settle, never down (frequent_settles_never_burn_less)', () => {
    const grid = loadedGrid()
    expect(fuelBurn(grid, 100)).toBe(156n)
    expect(fuelBurn(grid, 1_000)).toBe(1_556n)
  })

  it('splits the load across generators (each_generator_burns_its_share)', () => {
    const grid = loadedGrid({
      capacityMw: '1500000',
      modules: {
        '401': {
          desiredOnline: true,
          activeDraw: '1200000',
          powerReq: '1200000',
          drawKind: 'Firm',
        },
      },
      generators: {
        '101': {
          online: true,
          maxOutputMw: '1000000',
          containmentReduction: '100000',
          baseFuelRate: '10000',
        },
        '102': {
          online: true,
          maxOutputMw: '500000',
          containmentReduction: '10000',
          baseFuelRate: '10000',
        },
      },
    })
    expect(fuelBurn(grid, 1_000)).toBe(12_445n + 62_223n)
  })

  it('burns nothing with no load (idle_grid_burns_nothing)', () => {
    const grid = loadedGrid({
      modules: {
        '401': {
          desiredOnline: false,
          activeDraw: '0',
          powerReq: '100000',
          drawKind: 'Firm',
        },
      },
    })
    expect(fuelBurn(grid, 1_000_000)).toBe(0n)
    expect(fuelBurnPerHour(grid)).toBe(0n)
    expect(msUntilEmpty(grid, 1_000_000)).toBeNull()
  })

  it('skips offline generators', () => {
    const grid = loadedGrid()
    grid.generators['101']!.online = false
    expect(fuelBurn(grid, 10_000)).toBe(0n)
  })

  it('burns nothing before the last settle', () => {
    expect(fuelBurn(loadedGrid({ lastSettledMs: '5000' }), 4_000)).toBe(0n)
  })

  it('never burns more than is left', () => {
    const grid = loadedGrid({ fuelQuantity: '1000' })
    expect(fuelBurn(grid, 10_000)).toBe(1_000n)
    expect(projectedFuel(grid, 10_000)).toBe(0n)
    expect(msUntilEmpty(grid, 10_000)).toBe(0)
  })
})

describe('grid figures', () => {
  it('sums module draws and reports capacity only while on with fuel', () => {
    const grid = loadedGrid()
    expect(usedMw(grid)).toBe(100_000n)
    expect(effectiveCapacityMw(grid)).toBe(150_000n)
    expect(effectiveCapacityMw({ ...grid, on: false })).toBe(0n)
    expect(effectiveCapacityMw({ ...grid, fuelQuantity: '0' })).toBe(0n)
  })

  it('projects the time left from the hourly burn', () => {
    const grid = loadedGrid()
    const perHour = fuelBurnPerHour(grid)
    // 10 MW × 10^4 × 3600 s ÷ factor 642_857 = 5_600_001.2, rounded up
    expect(perHour).toBe(5_600_002n)
    // 500_000_000 / 5_600_002 per hour ≈ 89.3 h
    expect(msUntilEmpty(grid, 0)).toBe(
      Number((500_000_000n * 3_600_000n) / perHour),
    )
  })

  it('converts fixed point to whole units', () => {
    expect(fromFixed('150000')).toBe(15)
    expect(fromFixed(2_500n)).toBe(0.25)
  })
})
