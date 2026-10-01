import { defineConfig, devices } from "@playwright/test";

// 검증용 리포트 텍스트 추출. 이미 실행 중인 개발 서버(기본 3000번)를 쓴다.
// 사용: npm.cmd run validate:capture   (서버 주소는 E2E_BASE_URL로 바꿀 수 있다)
export default defineConfig({
  testDir: ".",
  testMatch: "capture-reports.spec.ts",
  workers: 2,
  timeout: 60000,
  reporter: "line",
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", ...devices["Desktop Chrome"] },
});
