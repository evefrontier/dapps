import { canManage, gridSummary, useSmartObject } from '@evefrontier/dapp-kit'
import { useMemo } from 'react'

import { isPanelEnabled, useFlagVariant, useViewRole } from '../../flags'
import { consoleTabs } from './model'
import { useNow } from './useNow'

/**
 * What the full console and the single-tab client views both read: the
 * selected entity, the viewer's role, the grid summary at `nowMs`, and the
 * tabs this entity and role get.
 */
export function useConsoleState() {
  const { entity, entityOwner, loading, error, tenant } = useSmartObject()
  const { role, preview, isLoading: roleLoading } = useViewRole()
  const nowMs = useNow()

  const summary = useMemo(
    () => (entity?.powerGrid ? gridSummary(entity.powerGrid, nowMs) : null),
    [entity, nowMs],
  )

  const writer = canManage(role)
  const url = entity?.metadata?.url?.trim() ?? ''
  // Only counts in builds that show the flag panel
  const showDapp = useFlagVariant('assembly-show-dapp') === 'on'
  const tabs = consoleTabs({
    hasDapp: url !== '',
    forceDapp: isPanelEnabled() && showDapp,
    hasInventory: !!entity?.inventories.length,
    writer,
  })

  return {
    entity,
    entityOwner,
    loading,
    error,
    tenant,
    role,
    preview,
    roleLoading,
    summary,
    nowMs,
    writer,
    url,
    tabs,
  }
}

export type ConsoleState = ReturnType<typeof useConsoleState>
