// Step 5: 실제 /result 화면에 응답을 주입해 사용자에게 보이는 리포트 텍스트를 추출한다.
// 이름은 비워 둔다(블라인드 판정에서 이름이 단서가 되지 않도록). 날짜 줄은 저장 전에 지운다.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test, expect } from "@playwright/test";

const root = join(__dirname, "..");
const responses = readdirSync(join(root, "responses")).filter((f) => /^p\d{2}_run\d\.json$/.test(f)).sort();
const SESSION_KEY = "self-layers:v1.1:session";

for (const file of responses) {
  test(file, async ({ page }) => {
    const answers = JSON.parse(readFileSync(join(root, "responses", file), "utf8"));
    const session = { version: 2, name: "", answers, index: 0, stage: "review", completedAt: "2026-10-01T00:00:00.000Z" };
    await page.addInitScript(([key, value]) => {
      // 첫 로드에서만 주입한다(리포트가 새로 쓰지 않으므로 매번 같아도 무방).
      window.localStorage.setItem(key, value);
    }, [SESSION_KEY, JSON.stringify(session)] as const);
    await page.goto("/result");
    const article = page.locator("article.report");
    await expect(article).toBeVisible();
    const sections = await article.locator("section.page").evaluateAll((nodes) =>
      nodes.map((n) => (n as HTMLElement).innerText.replace(/\n{3,}/g, "\n\n").trim()));
    const text = sections.join("\n\n---\n\n")
      .split("\n").filter((line) => !/^\d{4}년 \d{1,2}월 \d{1,2}일/.test(line.trim())).join("\n");
    mkdirSync(join(root, "reports"), { recursive: true });
    writeFileSync(join(root, "reports", file.replace(/\.json$/, ".md")), `${text}\n`, "utf8");
    expect(text.length).toBeGreaterThan(1000);
  });
}
