import { EveFrontierProvider } from '@evefrontier/dapp-kit'
import { ErrorNotice, ErrorNoticeTypes } from '@eveworld/ui-components'
import { createTheme, ThemeProvider } from '@mui/material'
import { QueryClient } from '@tanstack/react-query'
import ReactDOM from 'react-dom/client'
import { ErrorBoundary } from 'react-error-boundary'
import App from './App'
import { FlagsProvider } from './flags'

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
  typography: {
    fontFamily: 'Favorit',
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          padding: '0px !important',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: 'transparent',
          letterSpacing: 0,
        },
        message: {
          padding: '0px !important',
        },
      },
    },
  },
})

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
        <ThemeProvider theme={darkTheme}>
          <App />
        </ThemeProvider>
      </EveFrontierProvider>
    </FlagsProvider>
  </ErrorBoundary>,
)
