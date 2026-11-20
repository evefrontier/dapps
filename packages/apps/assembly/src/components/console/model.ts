import {
  type EntityData,
  type EntityInventory,
  type GridSummary,
  generatorStates,
  type ModuleStatus,
  moduleStates,
  type NoPowerReason,
  projectedFuel,
} from '@evefrontier/dapp-kit'

import { mw, shortCode, units } from './format'

/**
 * What the console draws, worked out from the parsed entity. Display names
 * of modules and airlocks come from Datahub by `typeId`, in the components;
 * `fallbackName` is used until (or unless) one loads.
 */

/** Lamp colour: on (brand), wait (amber), main (red ring), off (hollow). */
export type Lamp = 'on' | 'wait' | 'main' | 'off'

export type CardKind = 'generator' | 'fuel' | 'module' | 'airlock' | 'other'

export interface BoardCard {
  componentId: string
  code: string
  kind: CardKind
  typeId: string | null
  fallbackName: string
  /** Null for a component that is not on the grid */
  lamp: Lamp | null
  /** State word, e.g. Online, Blocked, Feeding */
  word: string
  /** Second line, e.g. why it has no power; null when nothing to add */
  detail: string | null
  /** Label and value of what it uses or makes, e.g. `Firm`, `0.1 MW` */
  use: [string, string]
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

export interface AirlockView {
  componentId: string
  code: string
  typeId: string
  sectionName: string | null
  inventory: EntityInventory
}

const REASON: Record<NoPowerReason, string> = {
  mainOff: 'Resumes with the main breaker',
  generatorOff: 'No power · generator off',
  outOfFuel: 'No power · out of fuel',
  notEnoughPower: 'Not enough power · too many modules on',
}

const MODULE_WORD: Record<ModuleStatus, [Lamp, string]> = {
  online: ['on', 'Online'],
  reduced: ['on', 'Reduced'],
  off: ['off', 'Off'],
  mainOff: ['main', 'Main off'],
  blocked: ['wait', 'Blocked'],
}

/** The section names the layout gives: Section 1, 2… in layout order. */
function sectionNames(entity: EntityData): Map<string, string> {
  const names = new Map<string, string>()
  entity.layout?.sections.forEach((section, i) => {
    for (const id of section.moduleIds) names.set(id, `Section ${i + 1}`)
  })
  return names
}

function cardFor(
  entity: EntityData,
  componentId: string,
  nowMs: number,
): BoardCard {
  const grid = entity.powerGrid
  const code = shortCode(componentId)
  const base = { componentId, code, typeId: null, draw: 0n }

  const generator = grid?.generators[componentId]
  if (grid && generator) {
    const status = generatorStates(grid, nowMs).find(
      (g) => g.componentId === componentId,
    )?.status
    const output = `${mw(generator.maxOutputMw)} MW`
    const [lamp, word, detail]: [Lamp, string, string] =
      status === 'running'
        ? ['on', 'Running', `Making ${output}`]
        : status === 'mainOff'
          ? ['main', 'Main off', REASON.mainOff]
          : status === 'stopped'
            ? ['wait', 'Stopped', 'Out of fuel']
            : ['off', 'Off', 'Switched off']
    return {
      ...base,
      kind: 'generator',
      fallbackName: 'Generator',
      lamp,
      word,
      detail,
      use: ['Output', output],
    }
  }

  const fuelCapacity = grid?.fuelSources[componentId]
  if (grid && fuelCapacity !== undefined) {
    const feeding = projectedFuel(grid, nowMs) > 0n
    return {
      ...base,
      kind: 'fuel',
      fallbackName: 'Fuel',
      lamp: feeding ? 'on' : 'wait',
      word: feeding ? 'Feeding' : 'Empty',
      detail: `Holds ${units(fuelCapacity)} units`,
      use: ['Fuel source', units(fuelCapacity)],
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
    const [lamp, word] = MODULE_WORD[state.status]
    const detail =
      state.status === 'online'
        ? null
        : state.status === 'reduced'
          ? `${mw(state.draw)} of ${mw(state.powerReq)} MW`
          : state.status === 'off'
            ? 'Switched off'
            : state.reason
              ? REASON[state.reason]
              : null
    return {
      ...base,
      kind,
      typeId,
      fallbackName,
      lamp,
      word,
      detail,
      use: [state.drawKind, `${mw(state.powerReq)} MW`],
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
    word: 'No breaker',
    detail: null,
    use: [component?.kind ?? '', ''],
  }
}

/**
 * The breaker board: one column per layout section, in layout order, with a
 * card per component. Grid components that are in no section go in a last
 * column, so nothing on the grid is hidden.
 */
export function buildBoard(entity: EntityData, nowMs: number): BoardSection[] {
  const grid = entity.powerGrid
  const placed = new Set<string>()
  const sections: BoardSection[] = (entity.layout?.sections ?? []).map(
    (section, i) => {
      const cards = section.moduleIds.map((id) => {
        placed.add(id)
        return cardFor(entity, id, nowMs)
      })
      return {
        id: section.id,
        name: `Section ${i + 1}`,
        code: shortCode(section.id),
        cards,
        drawMw: cards.reduce((sum, card) => sum + card.draw, 0n),
      }
    },
  )

  const onGrid = grid
    ? [
        ...Object.keys(grid.generators),
        ...Object.keys(grid.fuelSources),
        ...Object.keys(grid.modules),
      ]
    : []
  const unplaced = onGrid.filter((id) => !placed.has(id))
  if (unplaced.length) {
    const cards = unplaced.map((id) => cardFor(entity, id, nowMs))
    sections.push({
      id: 'unplaced',
      name: sections.length ? 'Not in a section' : 'Modules',
      code: '',
      cards,
      drawMw: cards.reduce((sum, card) => sum + card.draw, 0n),
    })
  }
  return sections
}

/** Every airlock (inventory component), with the section it is in. */
export function buildAirlocks(entity: EntityData): AirlockView[] {
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
  word: string
} {
  if (!summary) return { lamp: 'off', word: 'No grid' }
  if (summary.status === 'online') return { lamp: 'on', word: 'Online' }
  if (summary.status === 'off') return { lamp: 'main', word: 'Power off' }
  return { lamp: 'wait', word: 'No power' }
}
