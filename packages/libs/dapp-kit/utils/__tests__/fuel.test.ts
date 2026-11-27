import { describe, expect, it } from 'vitest'
import type {
  EntityFuelBay,
  EntityGenerator,
  EntityPowerGrid,
  EntityPowerModule,
} from '../../types'
import {
  burnBreakdown,
  fromFixed,
  fuelBurn,
  fuelBurnPerHour,
  fuelFactor,
  fuelUnit,
  generatorBurn,
  generatorOutput,
  msUntilEmpty,
  normalizeFuel,
  normalizeMw,
  POOLS_FUEL_SCALE,
  poolGeneratorBurn,
  projectedFuel,
  projectGrid,
  sharedBurnImpulse,
  usedMw,
  volatilityShare,
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
        priority: '0',
        lineLoss: '0',
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
          priority: '0',
          lineLoss: '0',
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
          priority: '0',
          lineLoss: '0',
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
  it('sums module draws', () => {
    expect(usedMw(loadedGrid())).toBe(100_000n)
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

// === `pools` grids (world-contracts dev-v1.1.16+) ===
// Expected numbers are the world-contracts power tests at dev-v1.1.18:
// fuel_math.move, tests/fuel_bay_tests.move, tests/pool_tests.move and
// tests/grid_load_tests.move, with grid_scenario's constants.

const SCALE = POOLS_FUEL_SCALE
const KG = POOLS_FUEL_SCALE
const U64_MAX = (1n << 64n) - 1n
/** grid_scenario: 50_000 kg in the default bay, impulse 90, burden 14, volatility 1. */
const STARTING = 50_000n * KG
const POOL_IMPULSE = 90n * SCALE
const POOL_BURDEN = 14n * SCALE
const POOL_VOLATILITY = SCALE
/** grid_scenario: Generators' volatility limit 0.5, so the test fuels give full output. */
const VOLATILITY_LIMIT = SCALE / 2n
const IMPULSE_LIMIT = 100n * SCALE

function poolBay(
  quantity: bigint,
  { fuelType = '7', impulse = POOL_IMPULSE, online = true } = {},
): EntityFuelBay {
  return {
    capacity: (100_000n * KG).toString(),
    online,
    fuel: {
      fuelType: quantity > 0n ? fuelType : null,
      quantity: quantity.toString(),
      impulse: impulse.toString(),
      containmentBurden: POOL_BURDEN.toString(),
      volatility: POOL_VOLATILITY.toString(),
    },
  }
}

function poolGenerator(
  maxOutputMw: number,
  { fuelType = '7', impulseLimit = IMPULSE_LIMIT, online = true } = {},
): EntityGenerator {
  return {
    online,
    maxOutputMw: String(maxOutputMw),
    containmentReduction: '0',
    baseFuelRate: '0',
    fuelType,
    impulseLimit: impulseLimit.toString(),
    volatilityLimit: VOLATILITY_LIMIT.toString(),
  }
}

/** A switched-on module drawing its full requirement, plain MW. */
function poolModule(
  powerReq: number,
  drawKind: EntityPowerModule['drawKind'] = 'Firm',
): EntityPowerModule {
  return {
    desiredOnline: true,
    activeDraw: String(powerReq),
    powerReq: String(powerReq),
    drawKind,
    priority: '0',
    lineLoss: '0',
  }
}

function poolsGrid({
  generators,
  bays,
  modules,
}: Pick<EntityPowerGrid, 'generators' | 'modules'> & {
  bays: Record<string, EntityFuelBay>
}): EntityPowerGrid {
  const online = Object.values(bays).filter((b) => b.online)
  const sum = (xs: string[]) => xs.reduce((a, x) => a + BigInt(x), 0n)
  return {
    model: 'pools',
    on: true,
    fuelQuantity: sum(online.map((b) => b.fuel.quantity)).toString(),
    fuelCapacity: sum(online.map((b) => b.capacity)).toString(),
    capacityMw: '0',
    lastSettledMs: '0',
    fuelImpulse: POOL_IMPULSE.toString(),
    fuelContainmentBurden: POOL_BURDEN.toString(),
    modules,
    generators,
    fuelSources: Object.fromEntries(
      Object.entries(bays).map(([id, b]) => [id, b.capacity]),
    ),
    bays,
  }
}

/** fuel_bay_tests `loaded`: one 15 MW Generator, the default bay, `MOD_A` a 10 MW Firm module. */
const loadedPools = (module = poolModule(10)) =>
  poolsGrid({
    generators: { '101': poolGenerator(15) },
    bays: { '9001': poolBay(STARTING) },
    modules: { '401': module },
  })

describe('pools fuel_math', () => {
  it('burns a generator share of the load (half_share_burns_half_the_load)', () => {
    expect(poolGeneratorBurn(SCALE, 2n, 1n, 1n, 1n)).toBe(500_000n)
    expect(poolGeneratorBurn(SCALE, 2n, 1n, 1n, 1_000n)).toBe(500_000_000n)
    expect(poolGeneratorBurn(SCALE, 2n, 1n, 1n, 3_000n)).toBe(1_500_000_000n)
  })

  it('burns at a scaled impulse, ignoring burden (scaled_impulse_burns)', () => {
    expect(poolGeneratorBurn(46_666_600_000n, 10n, 10n, 10n, 1_000n)).toBe(
      214_286_021n,
    )
  })

  it('caps the burn at u64 max (burn_caps_at_u64_max)', () => {
    expect(poolGeneratorBurn(1n, U64_MAX, U64_MAX, U64_MAX, 1_000_000n)).toBe(
      U64_MAX,
    )
  })

  it('scales output by volatility up to the limit (volatility_share_caps_at_scale)', () => {
    expect(volatilityShare(SCALE / 2n, SCALE)).toBe(SCALE / 2n)
    expect(volatilityShare(2n * SCALE, SCALE)).toBe(SCALE)
    expect(volatilityShare(1n, U64_MAX)).toBe(1n)
    expect(volatilityShare(0n, SCALE)).toBe(0n)
  })

  it('floors output, at least 1 MW (output_scales_with_volatility)', () => {
    expect(generatorOutput(15n, volatilityShare(SCALE, 2n * SCALE))).toBe(7n)
    expect(generatorOutput(15n, 1n)).toBe(1n)
    expect(generatorOutput(15n, 0n)).toBe(0n)
  })
})

describe('pools grid projection', () => {
  it('burns 10 MW at impulse 90 over 10 s (burn_over_time_and_view_matches_settle)', () => {
    const grid = loadedPools()
    expect(projectedFuel(grid, 10_000)).toBe(STARTING - 1_111_111_112n)
    expect(fuelBurn(grid, 10_000)).toBe(1_111_111_112n)
    const live = projectGrid(grid, 10_000)
    expect(live.capacityMw).toBe(15n)
    expect(live.draws).toEqual({ '401': 10n })
    expect(live.on).toBe(true)
  })

  it('burns 400 kg an hour at 10 MW and impulse 90', () => {
    expect(fuelBurnPerHour(loadedPools())).toBe(400n * KG)
  })

  it('splits the load between generators by output (each_generator_burns_its_share)', () => {
    const grid = poolsGrid({
      generators: {
        '101': poolGenerator(100),
        '102': poolGenerator(50, { impulseLimit: 30n * SCALE }),
      },
      bays: { '9001': poolBay(STARTING) },
      modules: { '401': poolModule(120) },
    })
    expect(projectedFuel(grid, 1_000)).toBe(
      STARTING - (888_888_889n + 1_333_333_334n),
    )
  })

  it('burns online bays of a type together (online_bays_burn_in_proportion)', () => {
    const quarter = 12_500n * KG
    const grid = poolsGrid({
      generators: { '101': poolGenerator(15) },
      bays: { '9001': poolBay(STARTING), '9002': poolBay(quarter) },
      modules: { '401': poolModule(10) },
    })
    expect(projectedFuel(grid, 10_000)).toBe(
      STARTING + quarter - (888_888_890n + 222_222_222n),
    )
  })

  it('leaves offline bays out', () => {
    const grid = poolsGrid({
      generators: { '101': poolGenerator(15) },
      bays: {
        '9001': poolBay(STARTING),
        '9002': poolBay(STARTING, { online: false }),
      },
      modules: { '401': poolModule(10) },
    })
    expect(projectedFuel(grid, 10_000)).toBe(STARTING - 1_111_111_112n)
  })

  it('burns each pool at its own impulse (two_pools_burn_independently)', () => {
    const other = 1_000n * KG
    const grid = poolsGrid({
      generators: {
        '101': poolGenerator(15),
        '102': poolGenerator(15, { fuelType: '8' }),
      },
      bays: {
        '9001': poolBay(STARTING),
        '9002': poolBay(other, { fuelType: '8', impulse: 45n * SCALE }),
      },
      modules: { '401': poolModule(20) },
    })
    expect(projectGrid(grid, 0).capacityMw).toBe(30n)
    expect(projectedFuel(grid, 1_000)).toBe(
      STARTING + other - (111_111_112n + 222_222_223n),
    )
  })

  it('runs out at the exact millisecond and trips a Firm load (online_check_aborts_after_fuel_runs_out)', () => {
    const grid = loadedPools()
    // 50_000 kg at 400 kg/h: 125 h
    expect(msUntilEmpty(grid, 0)).toBe(450_000_000)
    expect(msUntilEmpty(grid, 50_000_000)).toBe(400_000_000)
    const after = projectGrid(grid, 10_000_000_000_000)
    expect(after.fuelNow).toBe(0n)
    expect(after.on).toBe(false)
    expect(after.draws).toEqual({ '401': 0n })
    expect(after.outputs).toEqual({ '101': 0n })
  })

  it('stays on when an Elastic load runs dry (elastic_run_out_does_not_trip)', () => {
    const after = projectGrid(
      loadedPools(poolModule(10, 'Elastic')),
      10_000_000_000_000,
    )
    expect(after.on).toBe(true)
    expect(after.draws).toEqual({ '401': 0n })
  })

  it('stops burning when the first pool runs dry and trips the Firm load', () => {
    const grid = poolsGrid({
      generators: {
        '101': poolGenerator(15),
        '102': poolGenerator(15, { fuelType: '8' }),
      },
      bays: {
        '9001': poolBay(STARTING),
        '9002': poolBay(1_000n * KG, { fuelType: '8', impulse: 45n * SCALE }),
      },
      modules: { '401': poolModule(20) },
    })
    // 10 MW of the type-8 pool's 1_000 kg at impulse 45: 4_500 s; then 20 MW
    // no longer fits the 15 MW left, so the grid trips and nothing burns
    expect(msUntilEmpty(grid, 0)).toBe(4_500_000)
    const after = projectGrid(grid, 4_500_000)
    expect(after.on).toBe(false)
    expect(after.capacityMw).toBe(15n)
  })

  it('burns nothing with no load', () => {
    const grid = loadedPools({
      ...poolModule(10),
      desiredOnline: false,
      activeDraw: '0',
    })
    expect(projectedFuel(grid, 10_000)).toBe(STARTING)
    expect(fuelBurnPerHour(grid)).toBe(0n)
    expect(msUntilEmpty(grid, 0)).toBeNull()
  })
})

describe('normalizing for display', () => {
  it('reads pools values as MW and kg at 10^4', () => {
    const grid = loadedPools()
    expect(normalizeMw(grid, '15')).toBe(150_000n)
    expect(normalizeFuel(grid, 99_819_888_888n)).toBe(998_198n)
    expect(fromFixed(normalizeFuel(grid, 99_819_888_888n))).toBeCloseTo(
      99.82,
      2,
    )
    expect(fuelUnit(grid)).toBe('kg')
  })

  it('leaves fuelFactor values as they are', () => {
    const grid = loadedGrid()
    expect(normalizeMw(grid, '150000')).toBe(150_000n)
    expect(normalizeFuel(grid, '500000000')).toBe(500_000_000n)
    expect(fuelUnit(grid)).toBe('units')
  })
})

describe('burnBreakdown', () => {
  it('puts the whole burn on the one generator, bay and module (pools)', () => {
    // 10 MW at impulse 90: 400 kg an hour
    expect(burnBreakdown(loadedPools(), 0)).toEqual({
      perHour: 400n * KG,
      generators: { '101': 400n * KG },
      sources: { '9001': { perHour: 400n * KG, fuelNow: STARTING } },
      modules: { '401': 400n * KG },
      impulses: { '101': POOL_IMPULSE },
    })
  })

  it('burns each generator at its own impulse (each_generator_burns_its_share)', () => {
    const grid = poolsGrid({
      generators: {
        '101': poolGenerator(100),
        '102': poolGenerator(50, { impulseLimit: 30n * SCALE }),
      },
      bays: { '9001': poolBay(STARTING) },
      modules: { '401': poolModule(120) },
    })
    const burn = burnBreakdown(grid, 0)
    // 80 MW at impulse 90 and 40 MW at impulse 30
    expect(burn.generators).toEqual({ '101': 3_200n * KG, '102': 4_800n * KG })
    expect(burn.impulses).toEqual({ '101': 90n * SCALE, '102': 30n * SCALE })
    expect(sharedBurnImpulse(burn)).toBeNull()
    expect(burn.perHour).toBe(fuelBurnPerHour(grid, 0))
    expect(burn.sources['9001']?.perHour).toBe(8_000n * KG)
  })

  it('draws from each pool for its own generators (two_pools_burn_independently)', () => {
    const grid = poolsGrid({
      generators: {
        '101': poolGenerator(15),
        '102': poolGenerator(15, { fuelType: '8' }),
      },
      bays: {
        '9001': poolBay(STARTING),
        '9002': poolBay(1_000n * KG, { fuelType: '8', impulse: 45n * SCALE }),
      },
      modules: { '401': poolModule(20) },
    })
    const burn = burnBreakdown(grid, 0)
    // 10 MW each, at impulse 90 and 45
    expect(burn.generators).toEqual({ '101': 400n * KG, '102': 800n * KG })
    expect(burn.sources['9001']?.perHour).toBe(400n * KG)
    expect(burn.sources['9002']?.perHour).toBe(800n * KG)
  })

  it('shares a pool between its bays by what they hold', () => {
    const quarter = 12_500n * KG
    const burn = burnBreakdown(
      poolsGrid({
        generators: { '101': poolGenerator(15) },
        bays: { '9001': poolBay(STARTING), '9002': poolBay(quarter) },
        modules: { '401': poolModule(10) },
      }),
      0,
    )
    expect(burn.sources['9001']?.perHour).toBe(320n * KG)
    expect(burn.sources['9002']?.perHour).toBe(80n * KG)
  })

  it('splits the burn between modules by draw', () => {
    const burn = burnBreakdown(
      poolsGrid({
        generators: { '101': poolGenerator(15) },
        bays: { '9001': poolBay(STARTING) },
        modules: { '401': poolModule(9), '402': poolModule(1, 'Elastic') },
      }),
      0,
    )
    expect(burn.modules).toEqual({ '401': 360n * KG, '402': 40n * KG })
  })

  it('gives the impulse every burning generator shares', () => {
    expect(sharedBurnImpulse(burnBreakdown(loadedPools(), 0))).toBe(
      POOL_IMPULSE,
    )
  })

  it('burns nothing once the grid has tripped', () => {
    const burn = burnBreakdown(loadedPools(), 10_000_000_000_000)
    expect(burn.perHour).toBe(0n)
    expect(sharedBurnImpulse(burn)).toBeNull()
    expect(burn.sources['9001']).toEqual({ perHour: 0n, fuelNow: 0n })
    expect(burn.modules).toEqual({ '401': 0n })
  })

  it('matches fuelBurnPerHour on a fuelFactor grid and burns nothing while it is off', () => {
    const grid = loadedGrid()
    const burn = burnBreakdown(grid, 0)
    expect(burn.perHour).toBe(fuelBurnPerHour(grid))
    expect(burn.sources['9001']).toEqual({
      perHour: burn.perHour,
      fuelNow: BigInt(STARTING_FUEL),
    })
    expect(burn.modules).toEqual({ '401': burn.perHour })
    expect(burn.impulses).toEqual({})
    expect(burnBreakdown({ ...grid, on: false }, 0).perHour).toBe(0n)
  })
})
