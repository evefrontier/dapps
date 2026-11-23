import {
  abbreviateAddress,
  type EntityData,
  type EntityOwner,
  type EntityPowerGrid,
  type GridSummary,
  type NoPowerReason,
} from '@evefrontier/dapp-kit'
import type {
  AirlockData,
  BoardSectionData,
  FuelPanelData,
  GridBanner,
  GridReadouts,
  IdentityRow,
  LampState,
} from '@eveworld/ui-components'

import { httpsUrl } from './dappSource'
import {
  ago,
  count,
  hostOf,
  hoursMinutes,
  m3,
  mw,
  shortCode,
  units,
} from './format'
import {
  type AirlockRow,
  type BoardSection,
  gridLamp,
  NO_POWER_LABEL,
} from './model'

/**
 * The props the ui-components views draw, built from the parsed entity.
 * Everything here is pure: the containers call the hooks and pass the
 * results in.
 */

/** The shell's character name, or its wallet when the character has none. */
export const shellLabel = (owner: EntityOwner | null): string =>
  owner?.character?.metadata?.name ||
  abbreviateAddress(owner?.walletAddress ?? owner?.holder ?? '') ||
  'Unknown'

/** The identity panel, apart from editing. */
export function identityViewProps({
  entity,
  owner,
  summary,
  controllerCount,
}: {
  entity: EntityData
  owner: EntityOwner | null
  summary: GridSummary | null
  /** Null hides the row (visitors don't see the controller count). */
  controllerCount: number | null
}): {
  code: string
  name: string | null
  lamp: { state: LampState; label: string; detail?: string[] }
  description?: string
  rows: IdentityRow[]
} {
  const metadata = entity.metadata
  const state = gridLamp(summary)
  const url = metadata?.url?.trim()
  const dappUrl = url ? httpsUrl(url)?.href : undefined

  const rows: IdentityRow[] = [{ label: 'Shell', value: shellLabel(owner) }]
  if (controllerCount !== null) {
    rows.push({ label: 'Controllers', value: String(controllerCount) })
  }
  if (dappUrl)
    rows.push({ label: 'Dapp', value: hostOf(dappUrl), href: dappUrl })

  return {
    code: `Assembly · ${entity.key.id}`,
    name: metadata?.name || null,
    lamp: {
      state: state.lamp,
      label: state.label,
      ...(summary && {
        detail: [
          `${summary.modulesOnline} of ${summary.modulesTotal} online`,
          `${mw(summary.drawMw)} / ${mw(summary.outputMw)} MW`,
        ],
      }),
    },
    ...(metadata?.description && { description: metadata.description }),
    rows,
  }
}

/** Below this share of fuel, the fuel bar turns low and the banner warns. */
export const LOW_FUEL = 0.1

/** What each no-power banner adds under its title (the title is NO_POWER_LABEL). */
const NO_POWER_BODY: Partial<Record<NoPowerReason, string>> = {
  outOfFuel:
    'The generator has stopped. Modules that are switched on resume when fuel is added in the game.',
  generatorOff:
    'No generator is switched on. Modules that are switched on resume when one is.',
}

export function gridReadouts(summary: GridSummary): GridReadouts {
  return {
    outputMw: mw(summary.outputMw),
    drawMw: mw(summary.drawMw),
    headroomMw: mw(summary.headroomMw),
    gaugePercent:
      summary.outputMw > 0n
        ? Math.min(
            100,
            (Number(summary.drawMw) / Number(summary.outputMw)) * 100,
          )
        : 0,
  }
}

/** At most one banner: why the grid is not running, or that fuel is low. */
export function gridBanner(summary: GridSummary): GridBanner | null {
  if (summary.status === 'off') {
    return {
      tone: 'red',
      title: 'Power off',
      body: 'The main breaker is open. Every module is offline and each breaker keeps its setting.',
    }
  }
  const body = summary.reason ? NO_POWER_BODY[summary.reason] : undefined
  if (summary.reason && body) {
    return { tone: 'amber', title: NO_POWER_LABEL[summary.reason], body }
  }
  if (summary.fuelFraction < LOW_FUEL && summary.msUntilEmpty !== null) {
    return {
      tone: 'amber',
      title: `Fuel low · ≈ ${hoursMinutes(summary.msUntilEmpty)} left`,
      body: `At the current draw of ${mw(summary.drawMw)} MW. Add fuel in the game to keep it running.`,
    }
  }
  return null
}

export function fuelPanel(
  grid: EntityPowerGrid,
  summary: GridSummary,
  nowMs: number,
): FuelPanelData {
  const estimate =
    summary.msUntilEmpty !== null && summary.fuelNow > 0n
      ? {
          left: hoursMinutes(summary.msUntilEmpty),
        }
      : summary.fuelNow === 0n
        ? 'Empty'
        : !grid.on
          ? 'Not burning · main breaker off'
          : 'Not burning'
  return {
    settledAgo: ago(nowMs - Number(grid.lastSettledMs)),
    fraction: summary.fuelFraction,
    low: summary.fuelFraction < LOW_FUEL,
    amount: `≈ ${units(summary.fuelNow)}`,
    capacity: units(summary.fuelCapacity),
    estimate,
    sources: Object.entries(grid.fuelSources).map(([id, capacity]) => ({
      id,
      label: `Fuel ${shortCode(id)}`,
      units: units(capacity),
    })),
  }
}

/** The board's sections, with each card's display name from Datahub. */
export function boardSections(
  board: BoardSection[],
  names: Record<string, string>,
): BoardSectionData[] {
  return board.map((section) => ({
    id: section.id,
    name: section.name,
    drawMw: mw(section.drawMw),
    cards: section.cards.map((card) => ({
      id: card.componentId,
      lamp: card.lamp,
      name: (card.typeId && names[card.typeId]) || card.fallbackName,
      code: card.code,
      status: card.statusLabel,
      specLabel: card.spec.label,
      specValue: card.spec.value,
      detail: card.detail,
    })),
  }))
}

/** The airlock cards; `showContents` adds what each holds. */
export function airlockCards(
  airlocks: AirlockRow[],
  names: Record<string, string>,
  showContents: boolean,
): AirlockData[] {
  return airlocks.map(
    ({ componentId, code, typeId, sectionName, inventory }) => {
      const capacity = Number(inventory.capacity)
      return {
        id: componentId,
        name: names[typeId] || inventory.name || 'Airlock',
        code,
        sectionName,
        used: m3(inventory.used),
        capacity: m3(inventory.capacity),
        fraction: capacity > 0 ? Number(inventory.used) / capacity : 0,
        ...(showContents && {
          items: inventory.items.map((item) => ({
            id: item.typeId,
            name: names[item.typeId] || `Type ${item.typeId}`,
            quantity: count(item.quantity),
            volume: m3(BigInt(item.quantity) * BigInt(item.volume)),
          })),
        }),
      }
    },
  )
}
