// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

import eslintConfigPrettier from "eslint-config-prettier";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

import globals from "globals";

export default [
  eslint.configs.recommended,
  { ignores: ["dist/*", "node_modules/*"] },
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  eslintPluginPrettierRecommended,
  {
    ignores: ["dist/*", "node_modules/*"],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        warnOnUnsupportedTypeScriptVersion: false,
      },
    },
  },
  {
    rules: {
      "max-len": ["warn", { code: 120 }],
      "no-console": [
        "error",
        {
          allow: ["error"],
        },
      ],
    },
  },
  {
    files: ["prettier.config.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
];
