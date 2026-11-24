import { ConsolePanel } from '@eveworld/ui-components'

import TabContent from './TabContent'
import { useConsoleState } from './useConsoleState'
import { type ClientTabName, clientTabNote, consoleNote } from './viewProps'

/**
 * One console tab on its own, for the game client's `/client/*` routes: no
 * top bar, identity panel or tab rail. When the Assembly or role doesn't get
 * the tab, it says why instead.
 */
const ClientTab = ({ tab }: { tab: ClientTabName }) => {
  const state = useConsoleState()
  const { entity, loading, error, tabs, roleLoading } = state

  if (!entity) {
    return <ConsolePanel note={consoleNote({ loading, error })} />
  }

  const note = clientTabNote({ tab, tabs, roleLoading })
  if (note) return <ConsolePanel note={note} />

  return (
    <ConsolePanel>
      <TabContent tab={tab} entity={entity} state={state} />
    </ConsolePanel>
  )
}

export default ClientTab
