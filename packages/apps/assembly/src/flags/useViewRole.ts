import { type EntityRole, useEntityRole } from '@evefrontier/dapp-kit'

import { isPanelEnabled } from './FlagDevPanel'
import { useFlagVariant } from './useFlags'

const FORCED: ReadonlySet<string> = new Set<EntityRole>([
  'visitor',
  'controller',
  'shell',
])

/**
 * The role the console renders for: the connected wallet's real role, or the
 * one forced by the `assembly-view-as` flag. The flag only counts in builds
 * that show the dev panel (`VITE_SHOW_FLAG_PANEL`), because flag overrides are
 * read from localStorage in every build. Forcing a role changes what is shown,
 * never what the wallet may sign.
 *
 * @returns `useEntityRole()`'s result, with `role` replaced when forced and
 *   `preview` true while it is
 */
export function useViewRole(): ReturnType<typeof useEntityRole> & {
  preview: boolean
} {
  const actual = useEntityRole()
  const variant = useFlagVariant('assembly-view-as')
  const forced =
    isPanelEnabled() && FORCED.has(variant) ? (variant as EntityRole) : null
  return { ...actual, role: forced ?? actual.role, preview: forced !== null }
}
