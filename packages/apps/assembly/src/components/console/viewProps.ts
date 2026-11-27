import {
  abbreviateAddress,
  type CharacterSummary,
  type EntityData,
  type EntityOwner,
  type EntityPowerGrid,
  type EntityRole,
  type GridSummary,
  isController,
  type NoPowerReason,
  normalizeFuel,
  sameAddress,
} from '@evefrontier/dapp-kit'
import type {
  AirlockData,
  BoardSectionData,
  CandidateData,
  ControllerRowData,
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
  fuelAmount,
  hostOf,
  m3,
  mw,
  shortCode,
  timeLeft,
} from './format'
import {
  type AirlockRow,
  type BoardSection,
  gridLamp,
  NO_POWER_LABEL,
} from './model'
import type { ControllerRow } from './useControllerRows'

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
  /**
   * Null hides the row: visitors don't see the controller count, and it's
   * unknown until the shell is.
   */
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
      title: `Fuel low · ≈ ${timeLeft(summary.msUntilEmpty)} left`,
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
          left: timeLeft(summary.msUntilEmpty),
        }
      : summary.fuelNow === 0n
        ? 'Empty'
        : // A run-out can trip a `pools` grid since the last settle
          !grid.on || summary.status === 'off'
          ? 'Not burning · main breaker off'
          : 'Not burning'
  const unit = summary.fuelUnit
  return {
    settledAgo: ago(nowMs - Number(grid.lastSettledMs)),
    fraction: summary.fuelFraction,
    low: summary.fuelFraction < LOW_FUEL,
    amount: `≈ ${fuelAmount(summary.fuelNow, unit)}`,
    capacity: fuelAmount(summary.fuelCapacity, unit),
    unit,
    estimate,
    sources: Object.entries(grid.fuelSources).map(([id, capacity]) => ({
      id,
      label: `Fuel ${shortCode(id)}`,
      units: fuelAmount(normalizeFuel(grid, capacity), unit),
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

/**
 * The Controllers list as the Access tab draws it. Every row but the
 * shell's gets Remove, which calls `onRemove` with its character id and
 * label. "You" marks the viewer's character, or the shell row when the
 * viewer is the shell.
 */
export function accessRows(
  rows: ControllerRow[],
  {
    viewerId,
    role,
    onRemove,
  }: {
    viewerId: string | null
    role: EntityRole
    onRemove: (characterId: string, label: string) => void
  },
): ControllerRowData[] {
  return rows.map((row) => {
    const label = row.name || 'Unknown character'
    const { characterId } = row
    return {
      key: row.key,
      name: label,
      isShell: row.isShell,
      isYou:
        sameAddress(row.characterId, viewerId) ||
        (row.isShell && role === 'shell'),
      address: abbreviateAddress(row.address ?? ''),
      ...(row.address && { addressTitle: row.address }),
      ...(!row.isShell &&
        characterId && { onRemove: () => onRemove(characterId, label) }),
    }
  })
}

/** Name-search results, tagged when already the shell or a controller. */
export function candidates(
  results: CharacterSummary[],
  {
    controllers,
    shellId,
    onPick,
  }: {
    controllers: string[] | null | undefined
    shellId: string | null
    onPick: (character: CharacterSummary) => void
  },
): CandidateData[] {
  return results.map((character) => {
    const tag = sameAddress(character.characterId, shellId)
      ? ('Shell' as const)
      : isController(character.characterId, controllers)
        ? ('Controller' as const)
        : undefined
    return {
      id: character.characterId,
      name: character.name || 'Unnamed character',
      code: shortCode(character.characterId),
      wallet: abbreviateAddress(character.walletAddress),
      ...(tag && { tag }),
      onPick: () => onPick(character),
    }
  })
}

/**
 * The top bar's role chip, or null for a visitor with no wallet. A forced
 * view (`assembly-view-as`) is always labelled, wallet or not. While the
 * role is still loading it reads "Checking access…" with no role styling,
 * rather than Visitor.
 */
export function roleChip({
  role,
  preview,
  loading = false,
  connected,
}: {
  role: EntityRole
  preview: boolean
  loading?: boolean
  connected: boolean
}): { role: string; label: string } | null {
  if (!connected && !preview) return null
  if (loading && !preview) return { role: '', label: 'Checking access…' }
  const label = preview
    ? `${role} · preview`
    : role === 'visitor'
      ? 'Visitor · read only'
      : role
  return { role, label }
}

/** What the console says before it has an Assembly to show. */
export function consoleNote({
  loading,
  error,
}: {
  loading: boolean
  error: string | null | undefined
}): string {
  if (loading) return 'Reading the Assembly…'
  if (error) return `Could not read the Assembly: ${error}`
  return 'No Assembly selected. Open this from an Assembly in the game.'
}
