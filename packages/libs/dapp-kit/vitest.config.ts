import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json"],
      reportOnFailure: true,
      exclude: ["**/node_modules/**", "**/docs/**"],
    },
  },
});
