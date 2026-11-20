import type { EntityRole } from '@evefrontier/dapp-kit'

const FORCED: ReadonlySet<string> = new Set<EntityRole>([
  'visitor',
  'controller',
  'shell',
])

/**
 * The role to render for: the forced one when the dev panel is enabled and
 * the `assembly-view-as` variant names a role, otherwise the actual role.
 *
 * @param actual - The connected wallet's real role
 * @param variant - The `assembly-view-as` flag value (`actual` or a role)
 * @param panelEnabled - Whether this build shows the flag panel
 * @returns The role to render for, and whether it is forced
 */
export function resolveViewRole(
  actual: EntityRole,
  variant: string,
  panelEnabled: boolean,
): { role: EntityRole; preview: boolean } {
  const forced =
    panelEnabled && FORCED.has(variant) ? (variant as EntityRole) : null
  return { role: forced ?? actual, preview: forced !== null }
}
