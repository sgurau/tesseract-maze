export default [
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        browser: true,
        es2022: true,
        THREE: "readonly",
        document: "readonly",
        window: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        HTMLElement: "readonly",
        HTMLCanvasElement: "readonly",
        CanvasRenderingContext2D: "readonly",
        WebGLRenderingContext: "readonly",
        console: "readonly",
        Math: "readonly",
        Array: "readonly",
        Object: "readonly",
        Map: "readonly",
        Set: "readonly",
        Promise: "readonly",
        JSON: "readonly",
        Error: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-undef": "error",
      "no-console": "off",
      "eqeqeq": ["error", "always"],
      "curly": ["error", "all"],
      "no-var": "error",
      "prefer-const": "error",
      "no-trailing-spaces": "error",
      "eol-last": "error",
      "indent": ["error", 4, { "SwitchCase": 1 }],
      "quotes": ["error", "single"],
      "semi": ["error", "always"]
    }
  }
]