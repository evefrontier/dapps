import { abbreviateAddress, useConnection } from '@evefrontier/dapp-kit'
import { type ConsoleTab, ConsoleView } from '@eveworld/ui-components'
import { useState } from 'react'

import IdentityPanel from './IdentityPanel'
import TabContent from './TabContent'
import { useConsoleState } from './useConsoleState'
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
  const state = useConsoleState()
  const { entity, entityOwner, loading, error, role, preview, roleLoading } =
    state
  const { currentAccount, handleConnect, handleDisconnect } = useConnection()
  const [chosen, setChosen] = useState<ConsoleTab | null>(null)

  const { tabs } = state
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
          summary={state.summary}
        />
      }
      tabs={tabs}
      active={active}
      onSelectTab={setChosen}
    >
      <TabContent tab={active} entity={entity} state={state} />
    </ConsoleView>
  )
}

export default Console
