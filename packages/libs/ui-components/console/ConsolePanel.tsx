import type { ReactNode } from 'react'

/**
 * A frameless console: one tab's content, or a `note` when there is nothing
 * to show, with none of `ConsoleView`'s top bar, identity panel or tab rail.
 * For hosts that draw their own frame, such as the game client.
 */
const ConsolePanel = ({
  note,
  children,
}: {
  /** Shown in place of the content, e.g. while the Assembly is being read. */
  note?: string
  children?: ReactNode
}) => (
  <div className="gc-page">
    <div className="gc gc-panel">
      {note !== undefined ? (
        <p className="note">{note}</p>
      ) : (
        <div className="main">{children}</div>
      )}
    </div>
  </div>
)

export default ConsolePanel
