/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** EVE World package ID on Sui (required) */
  readonly VITE_EVE_WORLD_PACKAGE_ID: string
  /** Optional smart assembly Sui object ID override */
  readonly VITE_OBJECT_ID?: string
  readonly VITE_LOG_LEVEL?: string
  /** Polling-backstop interval in ms; 0 disables it. Defaults to POLLING_INTERVAL. */
  readonly VITE_POLLING_INTERVAL?: string
  /** Optional bearer token sent as the Authorization header on the SSE subscription. */
  readonly VITE_GRAPHQL_SUBSCRIPTION_AUTH_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
