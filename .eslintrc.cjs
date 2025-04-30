// const version = require("./package.json").version

module.exports = {
  globals: {
    process: "readonly",
    require: "readonly",
    defineProps: "readonly",
    $ref: "readonly",
  },
  parserOptions: {
    sourceType: "module",
    ecmaVersion: "latest",
    project: "./tsconfig.json",
    extraFileExtensions: [".vue", ".svelte", ".astro"],
  },
  extends: [
    "plugin:@ota-meshi/recommended",
    "plugin:@ota-meshi/+node",
    "plugin:@ota-meshi/+typescript",
    "plugin:@ota-meshi/+prettier",
    "plugin:@ota-meshi/+package-json",
    "plugin:@ota-meshi/+json",
    "plugin:@ota-meshi/+yaml",
  ],
  rules: {
    "no-lonely-if": "off",
    "no-shadow": "off",
    "no-warning-comments": "warn",
    "require-jsdoc": "off",
    "prettier/prettier": [
      "error",
      {},
      {
        usePrettierrc: true,
      },
    ],
  },
  overrides: [
    {
      files: ["*.vue"],
      extends: ["plugin:@ota-meshi/+vue3", "plugin:@ota-meshi/+prettier"],
      parserOptions: {
        parser: { ts: "@typescript-eslint/parser" },
      },
      rules: {
        "vue/multi-word-component-names": "off",
      },
    },
    {
      files: ["*.svelte"],
      extends: ["plugin:@ota-meshi/+svelte", "plugin:@ota-meshi/+prettier"],
      parserOptions: {
        parser: { ts: "@typescript-eslint/parser" },
      },
      rules: {
        "one-var": "off",
      },
    },
    {
      files: ["*.astro"],
      extends: ["plugin:astro/recommended", "plugin:@ota-meshi/+prettier"],
      parserOptions: {
        parser: "@typescript-eslint/parser",
      },
      rules: {
        "no-unused-vars": [
          "error",
          { varsIgnorePattern: "^(?:_(?:[^_].*)?|Props)$" },
        ],
      },
    },
    {
      files: ["*.json"],
      parser: "jsonc-eslint-parser",
    },
    {
      files: ["*.ts"],
      parser: "@typescript-eslint/parser",
      rules: {
        "@typescript-eslint/naming-convention": ["off"],
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "no-implicit-globals": "off",
      },
    },
    {
      files: ["scripts/**/*.ts", "tests/**/*.ts"],
      rules: {
        "no-console": "off",
        "require-jsdoc": "off",
      },
    },
  ],
};
