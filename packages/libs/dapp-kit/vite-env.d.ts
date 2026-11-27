/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** World tier (dev | test | uat | ptu | live); overrides the tenant's tier */
  readonly VITE_EVE_WORLD_TIER?: string
  /** Optional smart assembly Sui object ID override */
  readonly VITE_OBJECT_ID?: string
  readonly VITE_LOG_LEVEL?: string
  /** Polling-backstop interval in ms; 0 disables it. Defaults to POLLING_INTERVAL. */
  readonly VITE_POLLING_INTERVAL?: string
  /** Backstop polling interval in ms while the subscription is up; 0 disables it. Defaults to SUBSCRIPTION_BACKSTOP_INTERVAL. */
  readonly VITE_SUBSCRIPTION_POLLING_INTERVAL?: string
  /** GraphQL subscription (SSE) URL, overriding the per-network default. */
  readonly VITE_SUI_GRAPHQL_SUBSCRIPTION_URL?: string
  /** Optional bearer token sent as the Authorization header on the subscription. */
  readonly VITE_GRAPHQL_SUBSCRIPTION_AUTH_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
