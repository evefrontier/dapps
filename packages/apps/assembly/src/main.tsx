import { EveFrontierProvider } from '@evefrontier/dapp-kit'
import { ErrorNotice } from '@eveworld/ui-components'
import { QueryClient } from '@tanstack/react-query'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './App'
import ClientTab from './components/console/ClientTab'
import Console from './components/console/Console'
import { FlagsProvider } from './flags'

import '@eveworld/ui-components/console.css'

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        path: '*',
        element: <Console />,
      },
      {
        path: '/client/grid',
        element: <ClientTab tab="grid" />,
      },
      {
        path: '/client/airlock',
        element: <ClientTab tab="airlock" />,
      },
      {
        path: '/client/access',
        element: <ClientTab tab="access" />,
      },
    ],
  },
])

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary
    fallback={
      <ErrorNotice message="Anomaly detected: See developer console for details" />
    }
  >
    <FlagsProvider>
      <EveFrontierProvider queryClient={queryClient}>
        <RouterProvider router={router} />
      </EveFrontierProvider>
    </FlagsProvider>
  </ErrorBoundary>,
)
