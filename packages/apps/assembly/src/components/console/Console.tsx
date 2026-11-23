import {
  abbreviateAddress,
  canManage,
  gridSummary,
  useConnection,
  useSmartObject,
} from '@evefrontier/dapp-kit'
import { type ConsoleTab, ConsoleView } from '@eveworld/ui-components'
import { useMemo, useState } from 'react'

import { isPanelEnabled, useFlagVariant, useViewRole } from '../../flags'
import AccessTab from './AccessTab'
import AirlockTab from './AirlockTab'
import DappTab from './DappTab'
import GridTab from './GridTab'
import IdentityPanel from './IdentityPanel'
import { consoleTabs } from './model'
import { useNow } from './useNow'
import { consoleNote, roleChip } from './viewProps'

/**
 * The Assembly's grid console: one screen per Assembly, in the Creation
 * Builder's language. Tabs: Dapp (first, and open by default, when the
 * Assembly has a dapp URL), Grid, Airlock (when it has an inventory) and
 * Access (for the shell and controllers only).
 *
 * The shell and controllers switch the main breaker, manage controllers and
 * see the airlock contents and the controller count; everything else looks
 * the same for every role.
 */
const Console = () => {
  const { entity, entityOwner, loading, error, tenant } = useSmartObject()
  const { role, preview, isLoading: roleLoading } = useViewRole()
  const { currentAccount, handleConnect, handleDisconnect } = useConnection()
  const nowMs = useNow()
  const [chosen, setChosen] = useState<ConsoleTab | null>(null)

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
  const active = chosen && tabs.includes(chosen) ? chosen : tabs[0]!

  const frame = {
    roleChip: roleChip({
      role,
      preview,
      loading: roleLoading,
      connected: !!currentAccount,
    }),
    wallet: currentAccount
      ? {
          label: abbreviateAddress(currentAccount.address),
          onDisconnect: handleDisconnect,
        }
      : null,
    onConnect: handleConnect,
  }

  if (!entity) {
    return <ConsoleView {...frame} note={consoleNote({ loading, error })} />
  }

  return (
    <ConsoleView
      {...frame}
      locked={entity.inFlight}
      identity={
        <IdentityPanel
          entity={entity}
          entityOwner={entityOwner}
          role={role}
          summary={summary}
        />
      }
      tabs={tabs}
      active={active}
      onSelectTab={setChosen}
    >
      {active === 'dapp' && (
        <DappTab url={url} itemId={entity.key.id} tenant={tenant} />
      )}
      {active === 'grid' && (
        <GridTab
          entity={entity}
          summary={summary}
          nowMs={nowMs}
          writable={writer}
        />
      )}
      {active === 'airlock' && (
        <AirlockTab entity={entity} showContents={writer} />
      )}
      {active === 'access' && <AccessTab />}
    </ConsoleView>
  )
}

export default Console
