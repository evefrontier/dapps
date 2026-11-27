import type { EntityDrawKind, EntityPowerGrid } from '../types'
import {
  burnBreakdown,
  fuelBurnPerHour,
  fuelUnit,
  type GridProjection,
  msUntilEmpty,
  normalizeFuel,
  normalizeMw,
  projectGrid,
  sharedBurnImpulse,
} from './fuel'

/**
 * Display state of a power grid and its modules, worked out from the parsed
 * grid. The chain stores draws and desired state but no reasons, so the
 * reason a switched-on module gets no power is inferred here.
 */

/**
 * Why something switched on has no power. `notEnoughPower` is the Firm
 * all-or-nothing rule: the Firm modules switched on need more than the
 * generators make, so none of them draw.
 *
 * @category Utilities - Power
 */
export type NoPowerReason =
  | 'mainOff'
  | 'generatorOff'
  | 'outOfFuel'
  | 'notEnoughPower'

/**
 * - `online`: drawing all it asks for (or it asks for 0 and the grid is live)
 * - `reduced`: an Elastic module drawing less than it asks for
 * - `off`: switched off
 * - `mainOff`: switched on, but the main breaker is off
 * - `blocked`: switched on, main breaker on, but no power granted; see `reason`
 *
 * @category Utilities - Power
 */
export type ModuleStatus = 'online' | 'reduced' | 'off' | 'mainOff' | 'blocked'

/** @category Utilities - Power */
export interface ModuleState {
  componentId: string
  status: ModuleStatus
  /** Set for `mainOff` and `blocked` */
  reason: NoPowerReason | null
  drawKind: EntityDrawKind
  /** Fixed point at 10^4 */
  powerReq: bigint
  /** Live draw, fixed point at 10^4; 0 once the fuel has run out */
  draw: bigint
}

/** @category Utilities - Power */
export type GeneratorStatus = 'running' | 'off' | 'mainOff' | 'stopped'

/** @category Utilities - Power */
export interface GeneratorState {
  componentId: string
  /** `stopped`: switched on, but out of fuel */
  status: GeneratorStatus
  /** Fixed point at 10^4 */
  maxOutputMw: bigint
}

/**
 * - `online`: main breaker on, a generator running, fuel left
 * - `off`: main breaker off
 * - `noPower`: main breaker on, but no generator running or no fuel; see `reason`
 *
 * @category Utilities - Power
 */
export type GridStatus = 'online' | 'off' | 'noPower'

/**
 * Power and fuel values are fixed point at 10^4 whatever the grid's model
 * (see `normalizeMw` and `normalizeFuel`); `fuelUnit` says what a whole unit
 * of fuel is.
 *
 * @category Utilities - Power
 */
export interface GridSummary {
  status: GridStatus
  reason: NoPowerReason | null
  /** Output of the generators that are on (`capacity_mw`) */
  outputMw: bigint
  /** MW drawn now; 0 once the fuel has run out */
  drawMw: bigint
  /** Usable capacity left; 0 unless the grid is online */
  headroomMw: bigint
  /** Modules `online` or `reduced` */
  modulesOnline: number
  modulesTotal: number
  fuelSettled: bigint
  fuelNow: bigint
  fuelCapacity: bigint
  /** Fuel now as a fraction of capacity, 0 to 1; 0 when there is no capacity */
  fuelFraction: number
  /** At the current draw; 0 when nothing draws */
  fuelBurnPerHour: bigint
  /** Null when nothing burns */
  msUntilEmpty: number | null
  /** What a whole unit of fuel is: abstract `units`, or `kg` on a `pools` grid */
  fuelUnit: 'units' | 'kg'
  /**
   * `pools` grids only: the usable impulse every burning generator shares,
   * fixed point; null when nothing burns or generators burn at different
   * impulses, and always null on a `fuelFactor` grid
   */
  burnImpulse: bigint | null
}

function gridState(live: GridProjection): {
  status: GridStatus
  reason: NoPowerReason | null
} {
  if (!live.on) return { status: 'off', reason: 'mainOff' }
  if (live.fuelNow === 0n) return { status: 'noPower', reason: 'outOfFuel' }
  if (live.capacityMw === 0n) {
    return { status: 'noPower', reason: 'generatorOff' }
  }
  return { status: 'online', reason: null }
}

/**
 * The state of every module on the grid, in connect order.
 *
 * @category Utilities - Power
 * @param grid - Parsed power grid
 * @param nowMs - Current time in ms since the epoch, to project fuel burn
 */
export function moduleStates(
  grid: EntityPowerGrid,
  nowMs: number,
): ModuleState[] {
  const projection = projectGrid(grid, nowMs)
  const live = gridState(projection)
  return Object.entries(grid.modules).map(([componentId, module]) => {
    const powerReq = normalizeMw(grid, module.powerReq)
    // `module_draw` reads 0 once nothing can feed it
    const draw = normalizeMw(grid, projection.draws[componentId] ?? 0n)
    const state = (
      status: ModuleStatus,
      reason: NoPowerReason | null = null,
    ): ModuleState => ({
      componentId,
      status,
      reason,
      drawKind: module.drawKind,
      powerReq,
      draw,
    })

    if (!module.desiredOnline) return state('off')
    if (!projection.on) return state('mainOff', 'mainOff')
    if (live.status !== 'online') return state('blocked', live.reason)
    if (powerReq === 0n || draw >= powerReq) return state('online')
    // Only Elastic modules take less than they ask for; Firm ones get all or nothing
    if (draw > 0n) {
      return state(module.drawKind === 'Elastic' ? 'reduced' : 'online')
    }
    return state('blocked', 'notEnoughPower')
  })
}

function generatorStatus(
  online: boolean,
  gridOn: boolean,
  fed: boolean,
): GeneratorStatus {
  if (!online) return 'off'
  if (!gridOn) return 'mainOff'
  if (!fed) return 'stopped'
  return 'running'
}

/**
 * The state of every generator on the grid. A generator is `stopped` when the
 * grid's fuel has run out, or on a `pools` grid when its own fuel type's pool
 * has.
 *
 * @category Utilities - Power
 */
export function generatorStates(
  grid: EntityPowerGrid,
  nowMs: number,
): GeneratorState[] {
  const live = projectGrid(grid, nowMs)
  return Object.entries(grid.generators).map(([componentId, generator]) => ({
    componentId,
    status: generatorStatus(
      generator.online,
      live.on,
      grid.model === 'pools'
        ? (live.outputs[componentId] ?? 0n) > 0n
        : live.fuelNow > 0n,
    ),
    maxOutputMw: normalizeMw(grid, generator.maxOutputMw),
  }))
}

/**
 * The grid at a glance: whether it is running and why not, output, draw,
 * headroom, how many modules are online, and fuel now and time left.
 *
 * @category Utilities - Power
 */
export function gridSummary(grid: EntityPowerGrid, nowMs: number): GridSummary {
  const projection = projectGrid(grid, nowMs)
  const live = gridState(projection)
  const outputMw = normalizeMw(grid, projection.capacityMw)
  const drawMw =
    projection.fuelNow === 0n
      ? 0n
      : normalizeMw(
          grid,
          Object.values(projection.draws).reduce((sum, d) => sum + d, 0n),
        )
  const modules = moduleStates(grid, nowMs)
  const capacity = BigInt(grid.fuelCapacity)
  return {
    status: live.status,
    reason: live.reason,
    outputMw,
    drawMw,
    headroomMw:
      live.status === 'online' && outputMw > drawMw ? outputMw - drawMw : 0n,
    modulesOnline: modules.filter(
      (m) => m.status === 'online' || m.status === 'reduced',
    ).length,
    modulesTotal: modules.length,
    fuelSettled: normalizeFuel(grid, grid.fuelQuantity),
    fuelNow: normalizeFuel(grid, projection.fuelNow),
    fuelCapacity: normalizeFuel(grid, capacity),
    fuelFraction:
      capacity > 0n ? Number(projection.fuelNow) / Number(capacity) : 0,
    fuelBurnPerHour:
      projection.fuelNow === 0n
        ? 0n
        : normalizeFuel(grid, fuelBurnPerHour(grid, nowMs)),
    msUntilEmpty: msUntilEmpty(grid, nowMs),
    fuelUnit: fuelUnit(grid),
    burnImpulse: impulseOf(grid, projection.fuelNow, nowMs),
  }
}

function impulseOf(
  grid: EntityPowerGrid,
  fuelNow: bigint,
  nowMs: number,
): bigint | null {
  if (fuelNow === 0n) return null
  const impulse = sharedBurnImpulse(burnBreakdown(grid, nowMs))
  return impulse === null ? null : normalizeFuel(grid, impulse)
}
