/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** EVE World package ID on Sui (required) */
  readonly VITE_EVE_WORLD_PACKAGE_ID: string;
  /** Optional smart assembly Sui object ID override */
  readonly VITE_OBJECT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
