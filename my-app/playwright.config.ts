import { defineConfig, devices } from "@playwright/test";

// E2E_BASE_URL이 있으면 이미 실행 중인 서버(예: npm run dev의 3000번)를 쓴다.
// Next 16은 한 프로젝트에서 개발 서버를 하나만 띄울 수 있다.
const external = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  timeout: 90000,
  use: { baseURL: external ?? "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: external ? undefined : {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
