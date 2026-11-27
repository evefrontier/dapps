import type { EntityGenerator, EntityPowerGrid, PowerGridModel } from '../types'

/**
 * Port of world-contracts `power::fuel_math` and the fuel parts of
 * `power::power_grid`, for both grid models (see {@link PowerGridModel}).
 * Integer maths in bigint, with the contract's rounding, so results match the
 * chain to the unit.
 *
 * - `fuelFactor` (up to dev-v1.1.11): `fuel_burn`, `fuel_left`, `used_mw`,
 *   `effective_capacity_mw`. Power, fuel and fuel stats are fixed point at
 *   {@link FUEL_SCALE} (4 decimals): 150000 is 15 MW.
 * - `pools` (dev-v1.1.16 onward): `project`, `step`, `pool_rates`,
 *   `capacity_of` and friends. Power is plain MW; fuel and fuel stats are fixed
 *   point at {@link POOLS_FUEL_SCALE} (1e-9 kg).
 */

/** Fixed-point scale of power, fuel and fuel stats on a `fuelFactor` grid (`fuel_math::SCALE` up to dev-v1.1.11). @category Utilities - Power */
export const FUEL_SCALE = 10_000n

/** Fixed-point scale of fuel and fuel stats on a `pools` grid (`fuel_math::SCALE` from dev-v1.1.16): 1e-9 kg. @category Utilities - Power */
export const POOLS_FUEL_SCALE = 1_000_000_000n

const MS_PER_SECOND = 1_000n
const MS_PER_HOUR = 3_600_000n
const MIN_FUEL_FACTOR = 10_000n
const MAX_FUEL_FACTOR = 1_000_000n
const U64_MAX = (1n << 64n) - 1n

const max = (a: bigint, b: bigint) => (a > b ? a : b)
const min = (a: bigint, b: bigint) => (a < b ? a : b)
const divideRoundUp = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator - 1n) / denominator

const modelOf = (grid: EntityPowerGrid): PowerGridModel =>
  grid.model ?? 'fuelFactor'

/**
 * Fixed-point scale of the grid's power values: {@link FUEL_SCALE} on a
 * `fuelFactor` grid, 1 (plain MW) on a `pools` grid.
 *
 * @category Utilities - Power
 */
export function powerScale(grid: EntityPowerGrid): bigint {
  return modelOf(grid) === 'pools' ? 1n : FUEL_SCALE
}

/**
 * Fixed-point scale of the grid's fuel values: {@link FUEL_SCALE} on a
 * `fuelFactor` grid, {@link POOLS_FUEL_SCALE} on a `pools` grid.
 *
 * @category Utilities - Power
 */
export function fuelScale(grid: EntityPowerGrid): bigint {
  return modelOf(grid) === 'pools' ? POOLS_FUEL_SCALE : FUEL_SCALE
}

/**
 * What a whole unit of the grid's fuel is: abstract `units` on a `fuelFactor`
 * grid, `kg` on a `pools` grid.
 *
 * @category Utilities - Power
 */
export function fuelUnit(grid: EntityPowerGrid): 'units' | 'kg' {
  return modelOf(grid) === 'pools' ? 'kg' : 'units'
}

const rescale = (value: bigint, from: bigint): bigint =>
  from === FUEL_SCALE ? value : (value * FUEL_SCALE) / from

/**
 * A power value of this grid at {@link FUEL_SCALE}, whatever the grid's model:
 * plain MW on a `pools` grid becomes MW × 10^4. For display with
 * {@link fromFixed}.
 *
 * @category Utilities - Power
 */
export function normalizeMw(
  grid: EntityPowerGrid,
  value: bigint | string,
): bigint {
  return rescale(BigInt(value), powerScale(grid))
}

/**
 * A fuel value of this grid at {@link FUEL_SCALE}, whatever the grid's model:
 * 1e-9 kg on a `pools` grid becomes kg × 10^4, rounded down. For display with
 * {@link fromFixed}; see {@link fuelUnit} for what one unit is.
 *
 * @category Utilities - Power
 */
export function normalizeFuel(
  grid: EntityPowerGrid,
  value: bigint | string,
): bigint {
  return rescale(BigInt(value), fuelScale(grid))
}

/**
 * Fuel burned per second of load: `impulse / max(1, burden / containment_reduction)`,
 * clamped to [1, 100]. All values at {@link FUEL_SCALE}. Port of `fuel_math::fuel_factor`.
 *
 * @category Utilities - Power
 */
export function fuelFactor(
  impulse: bigint,
  containmentBurden: bigint,
  containmentReduction: bigint,
): bigint {
  const reduction = max(containmentReduction, FUEL_SCALE)
  const burdenRatio = max(
    (containmentBurden * FUEL_SCALE) / reduction,
    FUEL_SCALE,
  )
  const factor = (impulse * FUEL_SCALE) / burdenRatio
  return max(min(factor, MAX_FUEL_FACTOR), MIN_FUEL_FACTOR)
}

/** Inputs of {@link generatorBurn}, as in `fuel_math::generator_burn`. @category Utilities - Power */
export interface GeneratorBurnInput {
  impulse: bigint
  containmentBurden: bigint
  capacityMw: bigint
  maxOutputMw: bigint
  containmentReduction: bigint
  baseFuelRate: bigint
  load: bigint
  elapsedMs: bigint
}

/**
 * One online generator's burn over `elapsedMs`, rounded up. With no fuel
 * impulse it burns its base rate instead. Port of `fuel_math::generator_burn`.
 *
 * @category Utilities - Power
 */
export function generatorBurn(input: GeneratorBurnInput): bigint {
  if (input.impulse === 0n) {
    return divideRoundUp(input.baseFuelRate * input.elapsedMs, MS_PER_SECOND)
  }
  const factor = fuelFactor(
    input.impulse,
    input.containmentBurden,
    input.containmentReduction,
  )
  const numerator =
    input.load * input.maxOutputMw * FUEL_SCALE * input.elapsedMs
  const denominator = input.capacityMw * factor * MS_PER_SECOND
  return divideRoundUp(numerator, denominator)
}

/**
 * MW in use at the last settle: the sum of nonzero module draws. Port of
 * `power_grid::used_mw`.
 *
 * @category Utilities - Power
 */
export function usedMw(grid: EntityPowerGrid): bigint {
  let total = 0n
  for (const module of Object.values(grid.modules)) {
    total += BigInt(module.activeDraw)
  }
  return total
}

/**
 * Burn over `elapsedMs` at the load stored at the last settle, not capped by fuel.
 * Ignores `grid.on`: `set_power_grid` settles and regrants at zero capacity when
 * switched off, so an off grid's stored draws are all zero.
 */
function uncappedBurn(grid: EntityPowerGrid, elapsedMs: bigint): bigint {
  const capacityMw = BigInt(grid.capacityMw)
  const load = min(usedMw(grid), capacityMw)
  if (load === 0n || BigInt(grid.fuelQuantity) === 0n || elapsedMs <= 0n) {
    return 0n
  }
  let burn = 0n
  for (const generator of Object.values(grid.generators)) {
    if (!generator.online) continue
    burn += generatorBurn({
      impulse: BigInt(grid.fuelImpulse),
      containmentBurden: BigInt(grid.fuelContainmentBurden),
      capacityMw,
      maxOutputMw: BigInt(generator.maxOutputMw),
      containmentReduction: BigInt(generator.containmentReduction),
      baseFuelRate: BigInt(generator.baseFuelRate),
      load,
      elapsedMs,
    })
  }
  return burn
}

const nowOf = (nowMs: number): bigint => BigInt(Math.floor(nowMs))

/**
 * Fuel burned between the last settle and `nowMs`, capped at what is left.
 * Port of `power_grid::fuel_burn` (`fuelFactor`), or the settled fuel in
 * online bays less `projected_fuel` (`pools`). No load means no burn.
 *
 * @category Utilities - Power
 * @param grid - Parsed power grid
 * @param nowMs - Current time in ms since the epoch
 */
export function fuelBurn(grid: EntityPowerGrid, nowMs: number): bigint {
  if (modelOf(grid) === 'pools') {
    return BigInt(grid.fuelQuantity) - projectedFuel(grid, nowMs)
  }
  const elapsedMs = nowOf(nowMs) - BigInt(grid.lastSettledMs)
  return min(uncappedBurn(grid, elapsedMs), BigInt(grid.fuelQuantity))
}

/**
 * Fuel left now (in online bays, on a `pools` grid), with the burn since the
 * last settle applied. The same number `power_grid::projected_fuel` returns.
 *
 * @category Utilities - Power
 */
export function projectedFuel(grid: EntityPowerGrid, nowMs: number): bigint {
  if (modelOf(grid) === 'pools') {
    return onlineQuantity(projectPools(grid, nowOf(nowMs)).bays)
  }
  return BigInt(grid.fuelQuantity) - fuelBurn(grid, nowMs)
}

/**
 * Fuel the grid burns per hour, or 0 when nothing draws. Rounded up per
 * generator, as the contract rounds a single settle. On a `fuelFactor` grid
 * at the load stored at the last settle; on a `pools` grid at the load now
 * (`nowMs`, default the last settle), as `projected_pools`' burn rates.
 *
 * @category Utilities - Power
 */
export function fuelBurnPerHour(grid: EntityPowerGrid, nowMs?: number): bigint {
  if (modelOf(grid) === 'pools') {
    const at = nowMs === undefined ? BigInt(grid.lastSettledMs) : nowOf(nowMs)
    const { bays, capacity, draws } = projectPools(grid, at)
    const load = loadOf(draws, capacity)
    if (load === 0n) return 0n
    return poolRates(grid, poolsOf(bays)).reduce(
      (sum, rate) => sum + rateBurn(rate, capacity, load, MS_PER_HOUR),
      0n,
    )
  }
  return uncappedBurn(grid, MS_PER_HOUR)
}

/**
 * Time from `nowMs` until the grid stops burning at its current grants: the
 * fuel runs out (`fuelFactor`), or every pool in use runs dry or a run-out
 * trips the grid (`pools`, stepping through each pool's run-out as `project`
 * does). Null when nothing burns.
 *
 * @category Utilities - Power
 */
export function msUntilEmpty(
  grid: EntityPowerGrid,
  nowMs: number,
): number | null {
  if (modelOf(grid) === 'pools') {
    const now = nowOf(nowMs)
    const { bays, on, capacity, draws } = projectPools(grid, now)
    const { stoppedAt } = step(grid, bays, on, capacity, draws, now, U64_MAX)
    return stoppedAt === null || stoppedAt === now
      ? null
      : Number(stoppedAt - now)
  }
  const perHour = fuelBurnPerHour(grid)
  if (perHour === 0n) return null
  const left = projectedFuel(grid, nowMs)
  return Number((left * MS_PER_HOUR) / perHour)
}

/**
 * A fixed-point value as a number of whole units: `150000` → `15`.
 *
 * @category Utilities - Power
 * @param value - Fixed-point value
 * @param scale - Its scale; {@link FUEL_SCALE} by default. Pass the result of
 *   {@link normalizeMw} or {@link normalizeFuel} to display any grid's values.
 */
export function fromFixed(
  value: bigint | string,
  scale: bigint = FUEL_SCALE,
): number {
  const raw = typeof value === 'string' ? BigInt(value) : value
  return Number(raw) / Number(scale)
}

/**
 * A grid as it stands at `nowMs`: whether it is on, its generators' output,
 * each module's draw and each generator's output (plain MW on a `pools` grid,
 * at {@link FUEL_SCALE} on a `fuelFactor` one), and the fuel left.
 *
 * @category Utilities - Power
 */
export interface GridProjection {
  /** On a `pools` grid, false once a run-out has tripped it */
  on: boolean
  /** Generators' output, ignoring On/Off (`projected_capacity_mw`) */
  capacityMw: bigint
  /** Each module's draw by component id; 0 once nothing can feed it */
  draws: Record<string, bigint>
  /** Each generator's output by component id; 0 while off or out of fuel */
  outputs: Record<string, bigint>
  fuelNow: bigint
}

/**
 * Where the grid stands at `nowMs`. On a `fuelFactor` grid: the stored state,
 * with draws and output zeroed once the fuel has run out. On a `pools` grid:
 * `power_grid::project`, stepping through each pool's run-out, re-granting and
 * tripping as a settle would.
 *
 * @category Utilities - Power
 */
export function projectGrid(
  grid: EntityPowerGrid,
  nowMs: number,
): GridProjection {
  const draws: Record<string, bigint> = {}
  const outputs: Record<string, bigint> = {}
  if (modelOf(grid) === 'pools') {
    const projected = projectPools(grid, nowOf(nowMs))
    Object.keys(grid.modules).forEach((id, i) => {
      draws[id] = projected.draws[i] ?? 0n
    })
    const pools = poolsOf(projected.bays)
    for (const [id, generator] of Object.entries(grid.generators)) {
      outputs[id] = outputFrom(pools, generator)
    }
    return {
      on: projected.on,
      capacityMw: capacityOf(grid, projected.bays),
      draws,
      outputs,
      fuelNow: onlineQuantity(projected.bays),
    }
  }
  const fuelNow = projectedFuel(grid, nowMs)
  for (const [id, module] of Object.entries(grid.modules)) {
    draws[id] = fuelNow === 0n ? 0n : BigInt(module.activeDraw)
  }
  for (const [id, generator] of Object.entries(grid.generators)) {
    outputs[id] =
      generator.online && fuelNow > 0n ? BigInt(generator.maxOutputMw) : 0n
  }
  return {
    on: grid.on,
    capacityMw: BigInt(grid.capacityMw),
    draws,
    outputs,
    fuelNow,
  }
}

/**
 * Who burns the fuel and where it comes from, per hour at the grants in force
 * at `nowMs`. All values at the grid's fuel scale (see {@link fuelScale}).
 *
 * @category Utilities - Power
 */
export interface BurnBreakdown {
  /** The whole grid; the same as {@link fuelBurnPerHour} at `nowMs` */
  perHour: bigint
  /** By generator component id: what it burns. 0 while it supplies nothing. */
  generators: Record<string, bigint>
  /** By fuel source (fuel bay) component id: what is drawn from it, and the fuel it holds now */
  sources: Record<string, { perHour: bigint; fuelNow: bigint }>
  /**
   * By module component id: its share of the burn, by draw. What switching it
   * off would save, give or take rounding; 0 for a module drawing nothing.
   */
  modules: Record<string, bigint>
  /**
   * `pools` grids only, by generator component id: the usable impulse it burns
   * at (its pool's impulse, capped at its limit), for each generator burning.
   * Empty on a `fuelFactor` grid.
   */
  impulses: Record<string, bigint>
}

/**
 * Split the grid's burn per hour by generator, fuel source and module.
 *
 * On a `pools` grid each generator burns `generator_burn` over an hour at its
 * own output and usable impulse; each online bay feeds its pool's burn in
 * proportion to what it holds, as `take_from_online_bays` takes it. On a
 * `fuelFactor` grid each online generator burns `generator_burn` at the one
 * pool, and the sources, which only record a capacity, share it by capacity.
 *
 * @category Utilities - Power
 */
export function burnBreakdown(
  grid: EntityPowerGrid,
  nowMs: number,
): BurnBreakdown {
  const generators: Record<string, bigint> = {}
  const impulses: Record<string, bigint> = {}
  const sources: BurnBreakdown['sources'] = {}
  const moduleIds = Object.keys(grid.modules)
  let draws: bigint[]

  if (modelOf(grid) === 'pools') {
    const projected = projectPools(grid, nowOf(nowMs))
    draws = projected.draws
    const load = loadOf(draws, projected.capacity)
    const pools = poolsOf(projected.bays)
    const poolBurns = new Map<string, bigint>()
    for (const [id, generator] of Object.entries(grid.generators)) {
      const output = outputFrom(pools, generator)
      const pool =
        generator.fuelType === undefined
          ? undefined
          : pools.get(generator.fuelType)
      // `fuel_math::usable_impulse`
      const impulse = pool
        ? min(pool.impulse, BigInt(generator.impulseLimit ?? '0'))
        : 0n
      const burn =
        load > 0n && output > 0n && pool && generator.fuelType !== undefined
          ? poolGeneratorBurn(
              impulse,
              projected.capacity,
              output,
              load,
              MS_PER_HOUR,
            )
          : 0n
      generators[id] = burn
      if (burn > 0n) impulses[id] = impulse
      if (generator.fuelType !== undefined && burn > 0n) {
        poolBurns.set(
          generator.fuelType,
          (poolBurns.get(generator.fuelType) ?? 0n) + burn,
        )
      }
    }
    Object.keys(grid.bays ?? {}).forEach((id, i) => {
      const bay = projected.bays[i]
      if (!bay) return
      const pool = bay.fuelType === null ? undefined : pools.get(bay.fuelType)
      const poolBurn =
        bay.fuelType === null ? 0n : (poolBurns.get(bay.fuelType) ?? 0n)
      sources[id] = {
        perHour:
          bay.online && pool && pool.quantity > 0n
            ? (poolBurn * bay.quantity) / pool.quantity
            : 0n,
        fuelNow: bay.quantity,
      }
    })
  } else {
    const fuelNow = projectedFuel(grid, nowMs)
    // `set_power_grid` regrants at zero capacity when switched off, so an off
    // grid burns nothing whatever draws it still stores
    const burning = grid.on && fuelNow > 0n
    draws = moduleIds.map((id) =>
      burning ? BigInt(grid.modules[id]?.activeDraw ?? '0') : 0n,
    )
    const capacityMw = BigInt(grid.capacityMw)
    const load = min(usedMw(grid), capacityMw)
    for (const [id, generator] of Object.entries(grid.generators)) {
      generators[id] =
        generator.online && load > 0n && burning
          ? generatorBurn({
              impulse: BigInt(grid.fuelImpulse),
              containmentBurden: BigInt(grid.fuelContainmentBurden),
              capacityMw,
              maxOutputMw: BigInt(generator.maxOutputMw),
              containmentReduction: BigInt(generator.containmentReduction),
              baseFuelRate: BigInt(generator.baseFuelRate),
              load,
              elapsedMs: MS_PER_HOUR,
            })
          : 0n
    }
    const total = Object.values(generators).reduce((a, b) => a + b, 0n)
    const totalCapacity = Object.values(grid.fuelSources).reduce(
      (a, c) => a + BigInt(c),
      0n,
    )
    for (const [id, capacity] of Object.entries(grid.fuelSources)) {
      const share = (v: bigint) =>
        totalCapacity > 0n ? (v * BigInt(capacity)) / totalCapacity : 0n
      sources[id] = { perHour: share(total), fuelNow: share(fuelNow) }
    }
  }

  const perHour = Object.values(generators).reduce((a, b) => a + b, 0n)
  const drawn = draws.reduce((a, b) => a + b, 0n)
  const modules: Record<string, bigint> = {}
  moduleIds.forEach((id, i) => {
    const draw = draws[i] ?? 0n
    modules[id] = drawn > 0n ? (perHour * draw) / drawn : 0n
  })
  return { perHour, generators, sources, modules, impulses }
}

/**
 * The usable impulse every burning generator shares, at the grid's fuel scale;
 * null when nothing burns, when burning generators use different impulses, or
 * on a `fuelFactor` grid.
 *
 * @category Utilities - Power
 */
export function sharedBurnImpulse(burn: BurnBreakdown): bigint | null {
  const distinct = new Set(Object.values(burn.impulses))
  if (distinct.size !== 1) return null
  const [impulse] = distinct
  return impulse ?? null
}

// === `pools` grids: port of dev-v1.1.16+ `power::fuel_math` and `power::power_grid` ===

interface Bay {
  online: boolean
  fuelType: string | null
  quantity: bigint
  impulse: bigint
  volatility: bigint
}

interface Pool {
  quantity: bigint
  impulse: bigint
  volatility: bigint
}

/** One pool's burn inputs: what it holds and each supplying generator's usable impulse and output. */
interface PoolRate {
  fuelType: string
  quantity: bigint
  impulses: bigint[]
  outputs: bigint[]
}

/** The grid's bays as stored at the last settle, in install order. */
function baysOf(grid: EntityPowerGrid): Bay[] {
  return Object.values(grid.bays ?? {}).map((bay) => ({
    online: bay.online,
    fuelType: bay.fuel.fuelType,
    quantity: BigInt(bay.fuel.quantity),
    impulse: BigInt(bay.fuel.impulse),
    volatility: BigInt(bay.fuel.volatility),
  }))
}

const onlineQuantity = (bays: Bay[]): bigint =>
  bays.reduce((sum, bay) => (bay.online ? sum + bay.quantity : sum), 0n)

/**
 * Every pool by fuel type: the quantity-weighted blend of the online bays
 * holding it. A type with no fuel in an online bay is left out. Port of
 * `power_grid::pools_of`.
 */
function poolsOf(bays: Bay[]): Map<string, Pool> {
  const sums = new Map<string, Pool>()
  for (const bay of bays) {
    if (!bay.online || bay.quantity === 0n || bay.fuelType === null) continue
    const sum = sums.get(bay.fuelType) ?? {
      quantity: 0n,
      impulse: 0n,
      volatility: 0n,
    }
    sum.quantity += bay.quantity
    sum.impulse += bay.quantity * bay.impulse
    sum.volatility += bay.quantity * bay.volatility
    sums.set(bay.fuelType, sum)
  }
  const pools = new Map<string, Pool>()
  for (const [fuelType, sum] of sums) {
    pools.set(fuelType, {
      quantity: sum.quantity,
      impulse: sum.impulse / sum.quantity,
      volatility: sum.volatility / sum.quantity,
    })
  }
  return pools
}

/**
 * Share of rated output a pool's volatility allows, at {@link POOLS_FUEL_SCALE}:
 * `min(volatility × SCALE ÷ volatility_limit, SCALE)`, at least 1 while the
 * volatility is above zero. Port of `fuel_math::volatility_share`.
 *
 * @category Utilities - Power
 */
export function volatilityShare(
  poolVolatility: bigint,
  volatilityLimit: bigint,
): bigint {
  // The contract aborts on a zero limit; treat it as no limit
  const share =
    volatilityLimit === 0n
      ? POOLS_FUEL_SCALE
      : min(
          (poolVolatility * POOLS_FUEL_SCALE) / volatilityLimit,
          POOLS_FUEL_SCALE,
        )
  return poolVolatility > 0n ? max(share, 1n) : share
}

/**
 * Plain MW a generator sends out at `share`: `max_output_mw × share ÷ SCALE`,
 * floored, but at least 1 MW while both are above zero. Port of
 * `fuel_math::generator_output`.
 *
 * @category Utilities - Power
 */
export function generatorOutput(maxOutputMw: bigint, share: bigint): bigint {
  const output = (maxOutputMw * share) / POOLS_FUEL_SCALE
  return maxOutputMw > 0n && share > 0n ? max(output, 1n) : output
}

/**
 * One online generator's burn over `elapsedMs`, at {@link POOLS_FUEL_SCALE},
 * rounded up: its load (`load × output ÷ capacity`) over `usableImpulse`.
 * Capped at u64 max. Port of the dev-v1.1.16+ `fuel_math::generator_burn`.
 *
 * @category Utilities - Power
 */
export function poolGeneratorBurn(
  usableImpulse: bigint,
  capacityMw: bigint,
  outputMw: bigint,
  load: bigint,
  elapsedMs: bigint,
): bigint {
  const denominator = capacityMw * usableImpulse * MS_PER_SECOND
  // The contract aborts on a zero denominator; nothing burns
  if (denominator === 0n) return 0n
  const numerator =
    load * outputMw * POOLS_FUEL_SCALE * POOLS_FUEL_SCALE * elapsedMs
  return min(divideRoundUp(numerator, denominator), U64_MAX)
}

/** A generator's output with `pools`, plain MW: 0 while offline or its pool is empty. Port of `output_from`. */
function outputFrom(
  pools: Map<string, Pool>,
  generator: EntityGenerator,
): bigint {
  if (!generator.online || generator.fuelType === undefined) return 0n
  const pool = pools.get(generator.fuelType)
  if (!pool) return 0n
  const share = volatilityShare(
    pool.volatility,
    BigInt(generator.volatilityLimit ?? '0'),
  )
  return generatorOutput(BigInt(generator.maxOutputMw), share)
}

/** The sum of every generator's output with `bays`. Port of `capacity_of`. */
function capacityOf(grid: EntityPowerGrid, bays: Bay[]): bigint {
  const pools = poolsOf(bays)
  return Object.values(grid.generators).reduce(
    (sum, generator) => min(sum + outputFrom(pools, generator), U64_MAX),
    0n,
  )
}

/** MW the switched-on Firm modules need. Port of `desired_firm_mw`. */
function desiredFirmMw(grid: EntityPowerGrid): bigint {
  let total = 0n
  for (const module of Object.values(grid.modules)) {
    if (module.desiredOnline && module.drawKind === 'Firm') {
      total = min(total + BigInt(module.powerReq), U64_MAX)
    }
  }
  return total
}

/**
 * Each module's grant at `capacity`, in connect order: Firm modules all get
 * their requirement or none do; Elastic ones take the leftover in order. Port
 * of `draws_at`.
 */
function drawsAt(grid: EntityPowerGrid, capacity: bigint): bigint[] {
  const firmCost = desiredFirmMw(grid)
  const firmFits = firmCost <= capacity
  let leftover = firmFits ? capacity - firmCost : 0n
  return Object.values(grid.modules).map((module) => {
    if (!module.desiredOnline) return 0n
    if (module.drawKind === 'Firm') {
      return firmFits ? BigInt(module.powerReq) : 0n
    }
    const grant = min(BigInt(module.powerReq), leftover)
    leftover -= grant
    return grant
  })
}

/** MW actually burned: the sum of `draws`, capped at `capacity`. Port of `load_of`. */
function loadOf(draws: bigint[], capacity: bigint): bigint {
  return min(
    draws.reduce((sum, draw) => sum + draw, 0n),
    capacity,
  )
}

/** Burn inputs of each pool that has a supplying generator, in generator order. Port of `pool_rates`. */
function poolRates(
  grid: EntityPowerGrid,
  pools: Map<string, Pool>,
): PoolRate[] {
  const rates: PoolRate[] = []
  for (const generator of Object.values(grid.generators)) {
    const output = outputFrom(pools, generator)
    if (output === 0n || generator.fuelType === undefined) continue
    const pool = pools.get(generator.fuelType)
    if (!pool) continue
    let rate = rates.find((r) => r.fuelType === generator.fuelType)
    if (!rate) {
      rate = {
        fuelType: generator.fuelType,
        quantity: pool.quantity,
        impulses: [],
        outputs: [],
      }
      rates.push(rate)
    }
    // `fuel_math::usable_impulse`: the pool's impulse, capped at the generator's limit
    rate.impulses.push(min(pool.impulse, BigInt(generator.impulseLimit ?? '0')))
    rate.outputs.push(output)
  }
  return rates
}

/** A pool's burn over `elapsedMs` at `load` of `capacity`, uncapped. Port of `rate_burn`. */
function rateBurn(
  rate: PoolRate,
  capacity: bigint,
  load: bigint,
  elapsedMs: bigint,
): bigint {
  return rate.impulses.reduce(
    (sum, impulse, i) =>
      sum +
      poolGeneratorBurn(
        impulse,
        capacity,
        rate.outputs[i] ?? 0n,
        load,
        elapsedMs,
      ),
    0n,
  )
}

/**
 * Milliseconds until the first pool runs dry, or `remaining` if none does
 * within it. Binary search, as rounding up makes a closed form inexact. Port
 * of `first_run_out`.
 */
function firstRunOut(
  rates: PoolRate[],
  capacity: bigint,
  load: bigint,
  remaining: bigint,
): bigint {
  let first = remaining
  for (const rate of rates) {
    if (rateBurn(rate, capacity, load, first) >= rate.quantity) {
      let low = 1n
      let high = first
      while (low < high) {
        const mid = low + (high - low) / 2n
        if (rateBurn(rate, capacity, load, mid) >= rate.quantity) high = mid
        else low = mid + 1n
      }
      first = low
    }
  }
  return first
}

/**
 * Take `amount` from the online bays of `fuelType`, each in proportion to what
 * it holds; the rounding remainder comes off the largest, then the others in
 * install order. A bay that runs dry goes back to empty. Port of
 * `take_from_online_bays`. Returns new bays.
 */
function takeFromOnlineBays(
  bays: Bay[],
  fuelType: string,
  amount: bigint,
): Bay[] {
  if (amount === 0n) return bays
  const next = bays.map((bay) => ({ ...bay }))
  const feeds = (bay: Bay) => bay.online && bay.fuelType === fuelType
  const total = next.reduce(
    (sum, bay) => (feeds(bay) ? sum + bay.quantity : sum),
    0n,
  )
  let taken = 0n
  let largestIdx = 0
  let largestAmount = 0n
  next.forEach((bay, i) => {
    if (!feeds(bay) || bay.quantity === 0n) return
    if (bay.quantity > largestAmount) {
      largestAmount = bay.quantity
      largestIdx = i
    }
    const share = (bay.quantity * amount) / total
    bay.quantity -= share
    taken += share
  })
  let remainder = amount - taken
  const takeUpTo = (i: number) => {
    const bay = next[i]
    if (remainder === 0n || !bay || !feeds(bay)) return
    const take = min(remainder, bay.quantity)
    bay.quantity -= take
    remainder -= take
  }
  takeUpTo(largestIdx)
  for (let i = 0; i < next.length; i++) takeUpTo(i)
  for (const bay of next) {
    if (bay.quantity === 0n) bay.fuelType = null
  }
  return next
}

/**
 * Step `bays` from `fromMs` to `untilMs` at `on`, `capacity` and `draws`:
 * burn every pool up to the earliest run-out, recompute capacity, trip if the
 * switched-on Firm need no longer fits, re-grant, and repeat. Port of `step`.
 * Also returns when burning stopped (nothing left to burn, or tripped), or
 * null if it was still burning at `untilMs`.
 */
function step(
  grid: EntityPowerGrid,
  startBays: Bay[],
  startOn: boolean,
  startCapacity: bigint,
  startDraws: bigint[],
  fromMs: bigint,
  untilMs: bigint,
): {
  bays: Bay[]
  on: boolean
  capacity: bigint
  draws: bigint[]
  stoppedAt: bigint | null
} {
  let bays = startBays
  let on = startOn
  let capacity = startCapacity
  let draws = startDraws
  let at = fromMs
  while (untilMs > at) {
    const load = loadOf(draws, capacity)
    if (load === 0n) {
      return { bays, on, capacity, draws, stoppedAt: at }
    }
    const rates = poolRates(grid, poolsOf(bays))
    const elapsed = firstRunOut(rates, capacity, load, untilMs - at)
    at += elapsed
    for (const rate of rates) {
      const burn = min(rateBurn(rate, capacity, load, elapsed), rate.quantity)
      bays = takeFromOnlineBays(bays, rate.fuelType, burn)
    }
    capacity = capacityOf(grid, bays)
    if (desiredFirmMw(grid) > capacity) {
      on = false
      capacity = 0n
    }
    draws = drawsAt(grid, capacity)
  }
  const stopped = loadOf(draws, capacity) === 0n
  return { bays, on, capacity, draws, stoppedAt: stopped ? at : null }
}

/**
 * The grid at `nowMs` from its last settle: bays, whether it is on, effective
 * capacity, and each module's draw in connect order. Port of `project`.
 */
function projectPools(
  grid: EntityPowerGrid,
  nowMs: bigint,
): { bays: Bay[]; on: boolean; capacity: bigint; draws: bigint[] } {
  const bays = baysOf(grid)
  const draws = Object.values(grid.modules).map((m) => BigInt(m.activeDraw))
  const capacity = grid.on ? capacityOf(grid, bays) : 0n
  const { stoppedAt: _, ...projected } = step(
    grid,
    bays,
    grid.on,
    capacity,
    draws,
    BigInt(grid.lastSettledMs),
    nowMs,
  )
  return projected
}
