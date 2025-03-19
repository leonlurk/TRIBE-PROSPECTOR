export default {
  root: true,
  env: {
    es6: true,
    node: true
  },
  extends: [
    "eslint:recommended",
    "google"
  ],
  rules: {
    "quotes": ["error", "double"],
    "no-undef": "off",
    "no-unused-vars": "warn"
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module"
  }
};