import {
  createLogger,
  useNotification,
  useSmartObject,
} from '@evefrontier/dapp-kit'
import { EveAlert } from '@eveworld/ui-components'
import { useEffect } from 'react'

import Console from './components/console/Console'

import '@eveworld/ui-components/styles.css'

const log = createLogger()

/**
 * The app: notifications and the grid console, its only screen. There is no
 * routing; the path is ignored. The console has its own top bar and connect
 * button, and is read-only for visitors, so no wallet is needed to open it.
 */
const App = () => {
  const { notification } = useNotification()
  const { entity } = useSmartObject()

  useEffect(() => {
    if (entity?.id) log.info('[Dapp] Assembly %s selected', entity.id)
  }, [entity?.id])

  return (
    <>
      <EveAlert
        message={notification.message}
        txHash={notification.txHash}
        severity={notification.severity}
        handleClose={notification.handleClose}
        isOpen={notification.isOpen}
      />
      <Console />
    </>
  )
}

export default App
