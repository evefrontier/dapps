import { createLogger, useSmartObject } from '@evefrontier/dapp-kit'
import { useEffect } from 'react'

import Console from './components/console/Console'
import Toast from './components/console/Toast'
import { ToastProvider } from './components/console/ToastContext'

const log = createLogger()

/**
 * The app: the grid console, its only screen, and its transaction toast.
 * There is no routing; the path is ignored. The console has its own top bar
 * and connect button, and is read-only for visitors, so no wallet is needed
 * to open it.
 */
const App = () => {
  const { entity } = useSmartObject()

  useEffect(() => {
    if (entity?.id) log.info('[Dapp] Assembly %s selected', entity.id)
  }, [entity?.id])

  return (
    <ToastProvider>
      <Console />
      <Toast />
    </ToastProvider>
  )
}

export default App
