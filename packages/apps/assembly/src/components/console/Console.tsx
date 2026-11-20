import {
  abbreviateAddress,
  canManage,
  gridSummary,
  useConnection,
  useSmartObject,
} from '@evefrontier/dapp-kit'
import { useMemo, useState } from 'react'

import { useFlagVariant, useViewRole } from '../../flags'
import Controllers from '../Controllers'
import AirlockTab from './AirlockTab'
import DappTab from './DappTab'
import GridTab from './GridTab'
import IdentityPanel from './IdentityPanel'
import TabRail, { type ConsoleTab } from './TabRail'
import { useNow } from './useNow'

import './console.css'

const Ornament = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M8 1.2 14.8 8 8 14.8 1.2 8Z"
      fill="none"
      stroke="#ff4700"
      strokeWidth="1.2"
    />
    <path d="M8 5 11 8 8 11 5 8Z" fill="#ff4700" />
  </svg>
)

/**
 * The Assembly's grid console: one screen per Assembly, in the Creation
 * Builder's language. Tabs: Dapp (first, and open by default, when the
 * Assembly has a dapp URL), Grid, Airlock (when it has an inventory) and
 * Access (for the shell and controllers, behind `assembly-controllers`).
 *
 * The shell and controllers switch the main breaker, manage controllers and
 * see the airlock contents and the controller count; everything else looks
 * the same for every role.
 */
const Console = () => {
  const { entity, entityOwner, loading, error, tenant } = useSmartObject()
  const { role, preview, isLoading: roleLoading } = useViewRole()
  const { currentAccount, handleConnect, handleDisconnect } = useConnection()
  const accessEnabled = useFlagVariant('assembly-controllers') === 'on'
  const nowMs = useNow()
  const [chosen, setChosen] = useState<ConsoleTab | null>(null)

  const summary = useMemo(
    () => (entity?.powerGrid ? gridSummary(entity.powerGrid, nowMs) : null),
    [entity, nowMs],
  )

  const writer = canManage(role)
  const url = entity?.metadata?.url?.trim() ?? ''
  const tabs: ConsoleTab[] = [
    ...(url ? (['dapp'] as const) : []),
    'grid',
    ...(entity?.inventories.length ? (['airlock'] as const) : []),
    ...(writer && accessEnabled ? (['access'] as const) : []),
  ]
  const active = chosen && tabs.includes(chosen) ? chosen : tabs[0]!

  const top = (
    <div className="c-top">
      <div className="orn" aria-hidden="true">
        <Ornament />
        <Ornament />
      </div>
      <div className="screen-title">Assembly</div>
      <div className="who">
        {/* A forced view (assembly-view-as) is always labelled, wallet or not */}
        {(currentAccount || preview) && (
          <span className={`role-chip ${preview || !roleLoading ? role : ''}`}>
            {preview
              ? `${role} · preview`
              : roleLoading
                ? 'Checking access…'
                : role === 'visitor'
                  ? 'Visitor · read only'
                  : role}
          </span>
        )}
        {currentAccount ? (
          <button
            type="button"
            className="wallet"
            title="Disconnect"
            onClick={handleDisconnect}
          >
            {abbreviateAddress(currentAccount.address)}
          </button>
        ) : (
          <button type="button" className="gbtn plain" onClick={handleConnect}>
            Connect wallet
          </button>
        )}
      </div>
    </div>
  )

  if (!entity) {
    return (
      <div className="gc-page">
        <div className="gc">
          {top}
          <p className="note">
            {loading
              ? 'Reading the Assembly…'
              : error
                ? `Could not read the Assembly: ${error}`
                : 'No Assembly selected. Open this from an Assembly in the game.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="gc-page">
      <div className="gc">
        {top}
        {entity.inFlight && (
          <div className="strip lock">
            <span className="spin" aria-hidden="true" />
            <b>Transaction in flight</b>
            <span>
              The Assembly is locked until the chain settles it. This usually
              takes a few seconds.
            </span>
          </div>
        )}
        <div className="c-body">
          <IdentityPanel
            entity={entity}
            entityOwner={entityOwner}
            role={role}
            summary={summary}
          />
          <div className="main">
            <TabRail tabs={tabs} active={active} onSelect={setChosen} />
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
            {active === 'access' && <Controllers />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Console
