import {
  type BurnBreakdown,
  burnBreakdown,
  type EntityData,
  type EntityInventory,
  fuelUnit,
  type GeneratorStatus,
  type GridStatus,
  type GridSummary,
  generatorStates,
  type ModuleState,
  type ModuleStatus,
  moduleStates,
  type NoPowerReason,
  normalizeFuel,
  normalizeMw,
} from '@evefrontier/dapp-kit'
import type { ConsoleTab } from '@eveworld/ui-components'
import { burnRate, fuelAmount, mw, shortCode } from './format'

/**
 * What the console draws, worked out from the parsed entity. Display names
 * of modules and airlocks come from Datahub by `typeId`, in the components;
 * `fallbackName` is used until (or unless) one loads.
 */

/** Lamp colour: on (brand), wait (amber), main (red ring), off (hollow). */
export type Lamp = 'on' | 'wait' | 'main' | 'off'

export type CardKind = 'generator' | 'fuel' | 'module' | 'airlock' | 'other'

/** A labelled figure on a card, e.g. `Firm` / `needs 0.1 MW`. */
export interface CardSpec {
  label: string
  value: string
}

export interface BoardCard {
  componentId: string
  code: string
  kind: CardKind
  typeId: string | null
  fallbackName: string
  /** Null for a component with no breaker (not on the grid) */
  lamp: Lamp | null
  /** Short state label, e.g. Online, Blocked, Feeding */
  statusLabel: string
  /** Second line, e.g. what it burns or why it has no power */
  detail: string | null
  /** `burn`: the detail is a running module's share of the fuel burn */
  detailTone?: 'burn'
  /** What it needs, makes or holds */
  spec: CardSpec
  /** Live draw, fixed point; 0 for anything that does not draw */
  draw: bigint
}

export interface BoardSection {
  id: string
  name: string
  code: string
  cards: BoardCard[]
  /** Sum of the live draw of its cards, fixed point */
  drawMw: bigint
}

export interface AirlockRow {
  componentId: string
  code: string
  typeId: string
  sectionName: string | null
  inventory: EntityInventory
}

/** Short label for why something switched on has no power; cards and banners share it. */
export const NO_POWER_LABEL: Record<NoPowerReason, string> = {
  mainOff: 'Resumes with the main breaker',
  generatorOff: 'No power · generator off',
  outOfFuel: 'No power · out of fuel',
  notEnoughPower: 'Not enough power · too many modules on',
}

const MODULE_STATUS: Record<ModuleStatus, { lamp: Lamp; label: string }> = {
  online: { lamp: 'on', label: 'Online' },
  reduced: { lamp: 'on', label: 'Reduced' },
  off: { lamp: 'off', label: 'Off' },
  mainOff: { lamp: 'main', label: 'Main off' },
  blocked: { lamp: 'wait', label: 'Blocked' },
}

const GENERATOR_STATUS: Record<
  GeneratorStatus,
  { lamp: Lamp; label: string; detail: (output: string) => string }
> = {
  running: { lamp: 'on', label: 'Running', detail: (o) => `Making ${o}` },
  mainOff: {
    lamp: 'main',
    label: 'Main off',
    detail: () => NO_POWER_LABEL.mainOff,
  },
  stopped: { lamp: 'wait', label: 'Stopped', detail: () => 'Out of fuel' },
  off: { lamp: 'off', label: 'Off', detail: () => 'Switched off' },
}

const GRID_STATUS: Record<GridStatus, { lamp: Lamp; label: string }> = {
  online: { lamp: 'on', label: 'Online' },
  off: { lamp: 'main', label: 'Power off' },
  noPower: { lamp: 'wait', label: 'No power' },
}

const GRID_COMPONENT_KIND = 'power_grid::PowerGrid'

/** `Section 1`, `Section 2`… by position in the layout. */
const sectionName = (index: number): string => `Section ${index + 1}`

const sumDraw = (cards: BoardCard[]): bigint =>
  cards.reduce((sum, card) => sum + card.draw, 0n)

/** What a module's card says under its name, by state, other than its share of the burn. */
function moduleDetail(state: ModuleState): string | null {
  switch (state.status) {
    case 'online':
      return null
    case 'reduced':
      return `${mw(state.draw)} of ${mw(state.powerReq)} MW`
    case 'off':
      return 'Switched off'
    default:
      return state.reason ? NO_POWER_LABEL[state.reason] : null
  }
}

/** The section each component is in, by component id. */
function sectionNames(entity: EntityData): Map<string, string> {
  const names = new Map<string, string>()
  entity.layout?.sections.forEach((section, i) => {
    for (const id of section.moduleIds) names.set(id, sectionName(i))
  })
  return names
}

function cardFor(
  entity: EntityData,
  componentId: string,
  nowMs: number,
  burn: BurnBreakdown | null,
): BoardCard {
  const grid = entity.powerGrid
  const code = shortCode(componentId)
  const base = { componentId, code, typeId: null, draw: 0n }
  const unit = grid ? fuelUnit(grid) : 'units'
  /** A burn per hour at the grid's fuel scale, e.g. `40.0 kg/h` */
  const perHour = (raw: bigint) =>
    grid ? `${burnRate(normalizeFuel(grid, raw))} ${unit}/h` : ''

  const generator = grid?.generators[componentId]
  if (grid && generator) {
    const status =
      generatorStates(grid, nowMs).find((g) => g.componentId === componentId)
        ?.status ?? 'off'
    const output = `${mw(normalizeMw(grid, generator.maxOutputMw))} MW`
    const { lamp, label, detail } = GENERATOR_STATUS[status]
    return {
      ...base,
      kind: 'generator',
      fallbackName: 'Generator',
      lamp,
      statusLabel: label,
      detail:
        status === 'running'
          ? `${detail(output)} · burns ${perHour(burn?.generators[componentId] ?? 0n)}`
          : detail(output),
      spec: { label: 'Output', value: output },
    }
  }

  const fuelCapacity = grid?.fuelSources[componentId]
  if (grid && fuelCapacity !== undefined) {
    const source = burn?.sources[componentId]
    const holds = `${fuelAmount(normalizeFuel(grid, fuelCapacity), unit)} ${unit}`
    const empty = (source?.fuelNow ?? 0n) === 0n
    // Fuel left but nothing drawing on it (main breaker off, no generator
    // running, nothing switched on) is Idle, not Feeding
    const feeding = !empty && (source?.perHour ?? 0n) > 0n
    return {
      ...base,
      kind: 'fuel',
      fallbackName: 'Fuel bay',
      lamp: feeding ? 'on' : empty ? 'wait' : 'off',
      statusLabel: feeding ? 'Feeding' : empty ? 'Empty' : 'Idle',
      detail: feeding
        ? `Feeding ${perHour(source?.perHour ?? 0n)}`
        : empty
          ? `0 of ${holds}`
          : 'Nothing is burning it',
      spec: { label: 'Holds', value: holds },
    }
  }

  const state = grid
    ? moduleStates(grid, nowMs).find((m) => m.componentId === componentId)
    : undefined
  const inventory = entity.inventories.find(
    (i) => i.componentId === componentId,
  )
  const generic = entity.genericModules.find(
    (m) => m.componentId === componentId,
  )
  const typeId = inventory?.typeId ?? generic?.typeId ?? null
  const kind: CardKind = inventory ? 'airlock' : 'module'
  const fallbackName =
    inventory?.name ?? generic?.name ?? (inventory ? 'Airlock' : 'Module')

  if (state) {
    const { lamp, label } = MODULE_STATUS[state.status]
    // A running load's share of the burn: what switching it off would save
    const share =
      state.status === 'online' ? (burn?.modules[componentId] ?? 0n) : 0n
    return {
      ...base,
      kind,
      typeId,
      fallbackName,
      lamp,
      statusLabel: label,
      ...(share > 0n
        ? {
            detail: `≈ ${perHour(share)} of the burn`,
            detailTone: 'burn' as const,
          }
        : { detail: moduleDetail(state) }),
      spec: { label: state.drawKind, value: `needs ${mw(state.powerReq)} MW` },
      draw: state.draw,
    }
  }

  // In the layout but not on the grid: no breaker to show
  const component = entity.components.find((c) => c.id === componentId)
  const known = !!(inventory || generic)
  return {
    ...base,
    kind: known ? kind : 'other',
    typeId,
    fallbackName: known ? fallbackName : (component?.kind ?? 'Component'),
    lamp: null,
    statusLabel: 'No breaker',
    detail: null,
    spec: { label: component?.kind ?? '', value: '' },
  }
}

const section = (
  id: string,
  name: string,
  code: string,
  cards: BoardCard[],
): BoardSection => ({ id, name, code, cards, drawMw: sumDraw(cards) })

/**
 * The breaker board: one column per layout section, in layout order, with a
 * card per grid component. Then, when there are any: grid components that are
 * in no section ("Not in a section", or "Modules" with no layout at all), and
 * components with no breaker (in the layout but not on the grid), listed
 * apart so nothing is hidden. The grid component itself is left out: it is
 * the main breaker, which the identity panel shows.
 */
export function buildBoard(entity: EntityData, nowMs: number): BoardSection[] {
  const grid = entity.powerGrid
  const burn = grid ? burnBreakdown(grid, nowMs) : null
  // The grid component is the main breaker, shown in the identity panel
  const gridIds = new Set(
    entity.components
      .filter((c) => c.kind === GRID_COMPONENT_KIND)
      .map((c) => c.id),
  )
  const placed = new Set<string>()
  const noBreaker: BoardCard[] = []
  const sections = (entity.layout?.sections ?? []).map((layoutSection, i) => {
    const cards: BoardCard[] = []
    for (const id of layoutSection.moduleIds) {
      if (gridIds.has(id)) continue
      placed.add(id)
      const card = cardFor(entity, id, nowMs, burn)
      if (card.lamp === null) noBreaker.push(card)
      else cards.push(card)
    }
    return section(
      layoutSection.id,
      sectionName(i),
      shortCode(layoutSection.id),
      cards,
    )
  })

  const onGrid = grid
    ? [
        ...Object.keys(grid.generators),
        ...Object.keys(grid.fuelSources),
        ...Object.keys(grid.modules),
      ]
    : []
  const unplaced = onGrid.filter((id) => !placed.has(id))
  if (unplaced.length) {
    sections.push(
      section(
        'unplaced',
        sections.length ? 'Not in a section' : 'Modules',
        '',
        unplaced.map((id) => cardFor(entity, id, nowMs, burn)),
      ),
    )
  }
  if (noBreaker.length) {
    sections.push(section('no-breaker', 'No breaker', '', noBreaker))
  }
  return sections
}

/** Every airlock (inventory component), with the section it is in. */
export function buildAirlocks(entity: EntityData): AirlockRow[] {
  const sectionOf = sectionNames(entity)
  return entity.inventories.map((inventory) => ({
    componentId: inventory.componentId,
    code: shortCode(inventory.componentId),
    typeId: inventory.typeId,
    sectionName: sectionOf.get(inventory.componentId) ?? null,
    inventory,
  }))
}

/** The big state lamp in the identity panel. */
export function gridLamp(summary: GridSummary | null): {
  lamp: Lamp
  label: string
} {
  if (!summary) return { lamp: 'off', label: 'No grid' }
  return GRID_STATUS[summary.status]
}

/** The console's tabs, in rail order. */
export function consoleTabs({
  hasDapp,
  forceDapp,
  hasInventory,
  writer,
}: {
  hasDapp: boolean
  forceDapp: boolean
  hasInventory: boolean
  writer: boolean
}): ConsoleTab[] {
  return [
    ...(hasDapp || forceDapp ? (['dapp'] as const) : []),
    'grid',
    ...(hasInventory ? (['airlock'] as const) : []),
    ...(writer ? (['access'] as const) : []),
  ]
}
