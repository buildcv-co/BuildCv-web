import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e", "playwright-report", "test-results"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**", "lib/**", "components/**", "app/**"],
      exclude: ["**/*.d.ts", "**/*.config.{ts,tsx,mjs,js}", "**/types.ts"],
    },
  },
});
