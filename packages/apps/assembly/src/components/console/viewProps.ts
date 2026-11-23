import {
  abbreviateAddress,
  type EntityData,
  type EntityOwner,
  type GridSummary,
} from '@evefrontier/dapp-kit'
import type { IdentityRow, LampState } from '@eveworld/ui-components'

import { httpsUrl } from './dappSource'
import { hostOf, mw } from './format'
import { gridLamp } from './model'

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
