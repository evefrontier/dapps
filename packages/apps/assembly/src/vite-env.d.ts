/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

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
