import { createLogger, useSmartObject } from '@evefrontier/dapp-kit'
import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'

import Toast from './components/console/Toast'
import { ToastProvider } from './components/console/ToastContext'

const log = createLogger()

/**
 * The app's layout: the route's view and the transaction toast. The
 * `/client/grid`, `/client/airlock` and `/client/access` routes show that
 * one tab with no frame, for the game client; any other path shows the full
 * grid console, with its own top bar and connect button. Both are read-only
 * for visitors, so no wallet is needed to open them.
 */
const App = () => {
  const { entity } = useSmartObject()

  useEffect(() => {
    if (entity?.id) log.info('[Dapp] Assembly %s selected', entity.id)
  }, [entity?.id])

  return (
    <ToastProvider>
      <Outlet />
      <Toast />
    </ToastProvider>
  )
}

export default App
