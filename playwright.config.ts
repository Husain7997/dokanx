import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  workers: 1,
  expect: {
    timeout: 10_000,
  },
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  reporter: [["list"]],
  webServer: [
    {
      command: "cmd /c \"cd apps/backend&& set NODE_ENV=test&& set PORT=5101&& set JWT_SECRET=e2e-secret&& node src/server.js\"",
      url: "http://127.0.0.1:5101/",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "cmd /c \"set PORT=4100&& set NEXT_DIST_DIR=.next-e2e&& set NEXT_PUBLIC_API_URL=http://127.0.0.1:5101/api&& set E2E_API_URL=http://127.0.0.1:5101/api&& npm --prefix apps/frontend/storefront-web run dev\"",
      url: "http://127.0.0.1:4100/account",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "cmd /c \"set PORT=4101&& set NEXT_DIST_DIR=.next-e2e&& set NEXT_PUBLIC_API_URL=http://127.0.0.1:5101/api&& set E2E_API_URL=http://127.0.0.1:5101/api&& npm --prefix apps/frontend/merchant-dashboard run dev\"",
      url: "http://127.0.0.1:4101/sign-in",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
