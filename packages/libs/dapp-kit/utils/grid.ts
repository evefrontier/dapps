import type { EntityDrawKind, EntityPowerGrid } from '../types'
import { fuelBurnPerHour, msUntilEmpty, projectedFuel, usedMw } from './fuel'

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

/** Fixed-point values are at 10^4. @category Utilities - Power */
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
  /** At the current draw; 0 when nothing draws */
  fuelBurnPerHour: bigint
  /** Null when nothing burns */
  msUntilEmpty: number | null
}

function gridState(
  grid: EntityPowerGrid,
  nowMs: number,
): { status: GridStatus; reason: NoPowerReason | null; fuelNow: bigint } {
  const fuelNow = projectedFuel(grid, nowMs)
  if (!grid.on) return { status: 'off', reason: 'mainOff', fuelNow }
  if (fuelNow === 0n) return { status: 'noPower', reason: 'outOfFuel', fuelNow }
  if (BigInt(grid.capacityMw) === 0n) {
    return { status: 'noPower', reason: 'generatorOff', fuelNow }
  }
  return { status: 'online', reason: null, fuelNow }
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
  const live = gridState(grid, nowMs)
  return Object.entries(grid.modules).map(([componentId, module]) => {
    const powerReq = BigInt(module.powerReq)
    // `module_draw` reads 0 once the fuel has run out
    const draw = live.fuelNow === 0n ? 0n : BigInt(module.activeDraw)
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
    if (!grid.on) return state('mainOff', 'mainOff')
    if (live.status !== 'online') return state('blocked', live.reason)
    if (powerReq === 0n || draw >= powerReq) return state('online')
    if (draw > 0n) return state('reduced')
    return state('blocked', 'notEnoughPower')
  })
}

/**
 * The state of every generator on the grid.
 *
 * @category Utilities - Power
 */
export function generatorStates(
  grid: EntityPowerGrid,
  nowMs: number,
): GeneratorState[] {
  const fuelNow = projectedFuel(grid, nowMs)
  return Object.entries(grid.generators).map(([componentId, generator]) => ({
    componentId,
    status: !generator.online
      ? 'off'
      : !grid.on
        ? 'mainOff'
        : fuelNow === 0n
          ? 'stopped'
          : 'running',
    maxOutputMw: BigInt(generator.maxOutputMw),
  }))
}

/**
 * The grid at a glance: whether it is running and why not, output, draw,
 * headroom, how many modules are online, and fuel now and time left.
 *
 * @category Utilities - Power
 */
export function gridSummary(grid: EntityPowerGrid, nowMs: number): GridSummary {
  const live = gridState(grid, nowMs)
  const outputMw = BigInt(grid.capacityMw)
  const drawMw = live.fuelNow === 0n ? 0n : usedMw(grid)
  const modules = moduleStates(grid, nowMs)
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
    fuelSettled: BigInt(grid.fuelQuantity),
    fuelNow: live.fuelNow,
    fuelCapacity: BigInt(grid.fuelCapacity),
    fuelBurnPerHour: live.fuelNow === 0n ? 0n : fuelBurnPerHour(grid),
    msUntilEmpty: msUntilEmpty(grid, nowMs),
  }
}
