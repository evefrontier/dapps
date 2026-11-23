import type { ReactNode } from 'react'

import { Ornament } from './primitives'
import TabRail, { type ConsoleTab } from './TabRail'

/**
 * The grid console's frame: the top bar (title, role chip, wallet or
 * Connect), then either a `note` (nothing to show yet) or the body: the
 * in-flight strip when `locked`, the identity panel and the tab rail with
 * the active tab's content.
 */
const ConsoleView = ({
  roleChip,
  wallet,
  onConnect,
  note,
  locked,
  identity,
  tabs,
  active,
  onSelectTab,
  children,
}: {
  /** `role` is the chip's style: visitor, controller or shell. */
  roleChip: { role: string; label: string } | null
  /** The connected wallet, shortened, or null to show Connect wallet. */
  wallet: { label: string; onDisconnect: () => void } | null
  onConnect: () => void
  /** Shown in place of the body, e.g. while the Assembly is being read. */
  note?: string
  locked?: boolean
  identity?: ReactNode
  tabs?: ConsoleTab[]
  active?: ConsoleTab
  onSelectTab?: (tab: ConsoleTab) => void
  children?: ReactNode
}) => (
  <div className="gc-page">
    <div className="gc">
      <div className="c-top">
        <div className="orn" aria-hidden="true">
          <Ornament />
          <Ornament />
        </div>
        <div className="screen-title">Assembly</div>
        <div className="who">
          {roleChip && (
            <span className={`role-chip ${roleChip.role}`}>
              {roleChip.label}
            </span>
          )}
          {wallet ? (
            <button
              type="button"
              className="wallet"
              title="Disconnect"
              onClick={wallet.onDisconnect}
            >
              {wallet.label}
            </button>
          ) : (
            <button type="button" className="gbtn plain" onClick={onConnect}>
              Connect wallet
            </button>
          )}
        </div>
      </div>

      {note !== undefined ? (
        <p className="note">{note}</p>
      ) : (
        <>
          {locked && (
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
            {identity}
            <div className="main">
              {tabs && active && onSelectTab && (
                <TabRail tabs={tabs} active={active} onSelect={onSelectTab} />
              )}
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  </div>
)

export default ConsoleView
