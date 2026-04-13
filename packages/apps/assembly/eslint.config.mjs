import path from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import * as _import from "eslint-plugin-import-x";
import globals from "globals";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ["node_modules/**", "dist/**", "build_outputs/**"],
  },
  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ),
  {
    plugins: {
      import: _import,
    },

    languageOptions: {
      globals: {
        ...globals.node,
      },

      parser: tsParser,
      ecmaVersion: 5,
      sourceType: "module",
    },

    rules: {
      "import/order": [
        "error",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            ["parent", "sibling", "index"],
            "object",
            "type",
          ],

          pathGroups: [
            {
              pattern: "@eveworld/**",
              group: "external",
              position: "after",
            },
            {
              pattern: "./assets/**",
              group: "internal",
              position: "after",
            },
            {
              pattern: "./components/**",
              group: "internal",
              position: "before",
            },
          ],

          pathGroupsExcludedImportTypes: ["builtin"],
          "newlines-between": "always",

          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {},
  },
];
