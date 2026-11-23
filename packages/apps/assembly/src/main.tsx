import { EveFrontierProvider } from '@evefrontier/dapp-kit'
import { ErrorNotice, ErrorNoticeTypes } from '@eveworld/ui-components'
import { QueryClient } from '@tanstack/react-query'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App'
import { FlagsProvider } from './flags'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary
    fallback={
      <ErrorNotice
        type={ErrorNoticeTypes.MESSAGE}
        errorMessage="Anomaly detected: See developer console for details"
      />
    }
  >
    <FlagsProvider>
      <EveFrontierProvider queryClient={queryClient}>
        <App />
      </EveFrontierProvider>
    </FlagsProvider>
  </ErrorBoundary>,
)
