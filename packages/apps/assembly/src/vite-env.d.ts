/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  /** World tier (dev | test | uat | ptu | live); overrides the tenant's tier */
  readonly VITE_EVE_WORLD_TIER?: string
  /** Optional world entity object ID; takes priority over ?itemId= */
  readonly VITE_OBJECT_ID?: string
  /** Optional port for the dev server */
  readonly VITE_PORT?: string
  /** Optional log level */
  readonly VITE_LOG_LEVEL?: string
  /** Optional polling interval in ms for the selected entity; 0 turns polling off */
  readonly VITE_POLLING_INTERVAL?: string
  /** Set to "true" to render the internal feature-flag dev panel in this build */
  readonly VITE_SHOW_FLAG_PANEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** The assembly app's package.json version, injected by vite.config.ts. */
declare const __APP_VERSION__: string

/** Matches vite-plugin-svgr + svgrOptions { exportType: "named", namedExport: "ReactComponent" } */
declare module '*.svg' {
  import * as React from 'react'
  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string
      titleId?: string
      desc?: string
      descId?: string
    }
  >
  const src: string
  export default src
}
