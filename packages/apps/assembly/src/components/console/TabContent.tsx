import type { EntityData } from '@evefrontier/dapp-kit'
import type { ConsoleTab } from '@eveworld/ui-components'

import AccessTab from './AccessTab'
import AirlockTab from './AirlockTab'
import DappTab from './DappTab'
import GridTab from './GridTab'
import type { ConsoleState } from './useConsoleState'

/** One tab's content, for the full console and the client views alike. */
const TabContent = ({
  tab,
  entity,
  state: { summary, nowMs, writer, url, tenant },
}: {
  tab: ConsoleTab
  entity: EntityData
  state: ConsoleState
}) => {
  switch (tab) {
    case 'dapp':
      return <DappTab url={url} itemId={entity.key.id} tenant={tenant} />
    case 'grid':
      return (
        <GridTab
          entity={entity}
          summary={summary}
          nowMs={nowMs}
          writable={writer}
        />
      )
    case 'airlock':
      return <AirlockTab entity={entity} showContents={writer} />
    case 'access':
      return <AccessTab />
  }
}

export default TabContent
