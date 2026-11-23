/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** World tier (dev | test | uat | ptu | live); overrides the tenant's tier */
  readonly VITE_EVE_WORLD_TIER?: string
  /** Optional smart assembly Sui object ID override */
  readonly VITE_OBJECT_ID?: string
  readonly VITE_LOG_LEVEL?: string
  /** Polling-backstop interval in ms; 0 disables it. Defaults to POLLING_INTERVAL. */
  readonly VITE_POLLING_INTERVAL?: string
  /** Fenris private indexer GraphQL endpoint; defaults to FENRIS_INDEXER_URL */
  readonly VITE_FENRIS_INDEXER_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
