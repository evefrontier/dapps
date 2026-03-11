import { HoneycombWebSDK } from "@honeycombio/opentelemetry-web";
import { ThemeProvider, createTheme } from "@mui/material";
import { getWebAutoInstrumentations } from "@opentelemetry/auto-instrumentations-web";
import ReactDOM from "react-dom/client";
import { ErrorBoundary } from "react-error-boundary";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { EveFrontierProvider } from "@evefrontier/dapp-kit";
import { ErrorNotice, ErrorNoticeTypes } from "@eveworld/ui-components";

import BehaviourView from "./components/views/BehaviourView";
import MonitorView from "./components/views/MonitorView";
import Overview from "./components/views/Overview";
import RootView from "./components/views/RootView";

import App from "./App";
import { QueryClient } from "@tanstack/react-query";

const configDefaults = {
  ignoreNetworkEvents: false,
};

const sdk = new HoneycombWebSDK({
  debug: true, // Set to false for production environment.
  apiKey: import.meta.env.VITE_HONEYCOMB_API_KEY,
  serviceName: "assembly-dapp",
  sampleRate: 500, // Sample 1 in 500 events
  instrumentations: [
    getWebAutoInstrumentations({
      "@opentelemetry/instrumentation-xml-http-request": configDefaults,
      "@opentelemetry/instrumentation-fetch": configDefaults,
      "@opentelemetry/instrumentation-document-load": {
        ignoreNetworkEvents: false,
      },
      "@opentelemetry/instrumentation-user-interaction": {
        eventNames: ["click", "submit"],
      },
    }),
  ],
});
sdk.start();

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
  typography: {
    fontFamily: "Favorit",
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          padding: "0px !important",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          backgroundColor: "transparent",
          letterSpacing: 0,
        },
        message: {
          padding: "0px !important",
        },
      },
    },
  },
});

const router = createBrowserRouter([
  {
    element: <App />,
    children: [
      {
        path: "*",
        element: <Overview />,
      },
      {
        path: "/client/root",
        element: <RootView />,
      },
      {
        path: "/client/behaviour",
        element: <BehaviourView />,
      },
      {
        path: "/client/networknode/monitor",
        element: <MonitorView />,
      },
    ],
  },
]);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ErrorBoundary
    fallback={
      <ErrorNotice
        type={ErrorNoticeTypes.MESSAGE}
        errorMessage="Anomaly detected: See developer console for details"
      />
    }
  >
    <EveFrontierProvider queryClient={queryClient}>
      <ThemeProvider theme={darkTheme}>
        <RouterProvider router={router} />
      </ThemeProvider>
    </EveFrontierProvider>
  </ErrorBoundary>,
);
