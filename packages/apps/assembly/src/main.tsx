import { EveFrontierProvider } from '@evefrontier/dapp-kit'
import { ErrorNotice } from '@eveworld/ui-components'
import { QueryClient } from '@tanstack/react-query'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App'
import { FlagsProvider, useUpdateTransport } from './flags'

import '@eveworld/ui-components/console.css'

const queryClient = new QueryClient()

/**
 * Reads the update-transport flag (inside FlagsProvider) and hands it to the
 * dapp-kit providers. Switching it in the flag panel resubscribes or stops.
 */
function AppProviders() {
  const updateTransport = useUpdateTransport()
  return (
    <EveFrontierProvider
      queryClient={queryClient}
      updateTransport={updateTransport}
    >
      <App />
    </EveFrontierProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary
    fallback={
      <ErrorNotice message="Anomaly detected: See developer console for details" />
    }
  >
    <FlagsProvider>
      <AppProviders />
    </FlagsProvider>
  </ErrorBoundary>,
)
