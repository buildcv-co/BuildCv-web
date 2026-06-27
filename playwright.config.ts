import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html"]] : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node scripts/e2e-mock-backend.mjs & pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      BUILDCV_LOG_ENDPOINT: "enabled",
      NEXTAUTH_URL: `http://localhost:${PORT}`,
      NEXTAUTH_SECRET: "playwright-e2e-secret-that-is-long-enough-for-hs256!",
      GOOGLE_CLIENT_ID: "playwright-google-client-id",
      GOOGLE_CLIENT_SECRET: "playwright-google-client-secret",
      LINKEDIN_CLIENT_ID: "playwright-linkedin-client-id",
      LINKEDIN_CLIENT_SECRET: "playwright-linkedin-client-secret",
      JWT_CACHE_TTL_SECONDS: "300",
      BACKEND_URL: "http://127.0.0.1:4018",
    },
    stdout: "ignore",
    stderr: "pipe",
  },
});
