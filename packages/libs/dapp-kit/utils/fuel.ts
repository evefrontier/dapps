import type { EntityPowerGrid } from '../types'

/**
 * Port of world-contracts `power::fuel_math` and the fuel parts of
 * `power::power_grid` (`fuel_burn`, `fuel_left`, `used_mw`,
 * `effective_capacity_mw`). Integer maths in bigint, with the contract's
 * rounding, so results match the chain to the unit.
 *
 * Power, fuel and fuel stats are fixed point at {@link FUEL_SCALE} (4 decimals):
 * 150000 is 15 MW.
 */

/** Fixed-point scale of power, fuel and fuel stats (`fuel_math::SCALE`). @category Utilities - Power */
export const FUEL_SCALE = 10_000n

const MS_PER_SECOND = 1_000n
const MS_PER_HOUR = 3_600_000n
const MIN_FUEL_FACTOR = 10_000n
const MAX_FUEL_FACTOR = 1_000_000n

const max = (a: bigint, b: bigint) => (a > b ? a : b)
const min = (a: bigint, b: bigint) => (a < b ? a : b)
const divideRoundUp = (numerator: bigint, denominator: bigint) =>
  (numerator + denominator - 1n) / denominator

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

/**
 * Fuel burned between the last settle and `nowMs`, capped at what is left.
 * Port of `power_grid::fuel_burn`. No load means no burn.
 *
 * @category Utilities - Power
 * @param grid - Parsed power grid
 * @param nowMs - Current time in ms since the epoch
 */
export function fuelBurn(grid: EntityPowerGrid, nowMs: number): bigint {
  const elapsedMs = BigInt(Math.floor(nowMs)) - BigInt(grid.lastSettledMs)
  return min(uncappedBurn(grid, elapsedMs), BigInt(grid.fuelQuantity))
}

/**
 * Fuel left now, with the burn since the last settle applied. The same number
 * `power_grid::projected_fuel` returns.
 *
 * @category Utilities - Power
 */
export function projectedFuel(grid: EntityPowerGrid, nowMs: number): bigint {
  return BigInt(grid.fuelQuantity) - fuelBurn(grid, nowMs)
}

/**
 * Fuel the grid burns per hour at the load stored at the last settle, or 0
 * when nothing draws. Rounded up per generator, as the contract rounds a
 * single settle.
 *
 * @category Utilities - Power
 */
export function fuelBurnPerHour(grid: EntityPowerGrid): bigint {
  return uncappedBurn(grid, MS_PER_HOUR)
}

/**
 * Time until the fuel runs out at the stored load, from `nowMs`. Null when
 * nothing burns; 0 once it has run out.
 *
 * @category Utilities - Power
 */
export function msUntilEmpty(
  grid: EntityPowerGrid,
  nowMs: number,
): number | null {
  const perHour = fuelBurnPerHour(grid)
  if (perHour === 0n) return null
  const left = projectedFuel(grid, nowMs)
  return Number((left * MS_PER_HOUR) / perHour)
}

/**
 * A fixed-point value as a number of whole units: `150000` → `15`.
 *
 * @category Utilities - Power
 */
export function fromFixed(value: bigint | string): number {
  const raw = typeof value === 'string' ? BigInt(value) : value
  return Number(raw) / Number(FUEL_SCALE)
}
