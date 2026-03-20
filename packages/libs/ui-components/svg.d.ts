/** Aligns with vite-plugin-svgr `include: "**/*.svg"` + named ReactComponent export */
declare module "*.svg" {
  import * as React from "react";
  export const ReactComponent: React.FunctionComponent<
    React.SVGProps<SVGSVGElement> & {
      title?: string;
      titleId?: string;
      desc?: string;
      descId?: string;
    }
  >;
  const src: string;
  export default src;
}
