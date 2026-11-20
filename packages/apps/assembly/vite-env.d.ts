/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** World tier (dev | test | uat | ptu | live); overrides the tenant's tier */
  readonly VITE_EVE_WORLD_TIER?: string
  /** Optional smart assembly item ID override */
  readonly VITE_OBJECT_ID?: string
  /** Optional port for dev server */
  readonly VITE_PORT?: string
  /** Optional log level */
  readonly VITE_LOG_LEVEL?: string
  /** Set to "true" to render the internal feature-flag dev panel in this build. */
  readonly VITE_SHOW_FLAG_PANEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
