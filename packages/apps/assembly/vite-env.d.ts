/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** EVE World package ID on Sui (required) */
  readonly VITE_EVE_WORLD_PACKAGE_ID: string;
  /** Optional smart assembly item ID override */
  readonly VITE_OBJECT_ID?: string;
  /** Optional port for dev server */
  readonly VITE_PORT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
