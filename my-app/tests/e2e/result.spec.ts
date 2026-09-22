import { test, expect } from "@playwright/test";
import questions from "../../src/data/questions.json";
import { SESSION_KEY } from "../../src/lib/survey-session";

test("no result redirects to survey", async ({ page }) => {
  await page.goto("/result");
  await expect(page).toHaveURL(/\/survey/);
  await expect(page.getByRole("button", { name: "다음 문항" })).toBeDisabled();
});

test("incomplete stored result redirects and retains valid answers", async ({ page }) => {
  await page.addInitScript(({ key, id }) => localStorage.setItem(key, JSON.stringify({ version: 1, answers: { [id]: 4 }, stage: "result", index: 0 })), { key: SESSION_KEY, id: questions[0].id });
  await page.goto("/result");
  await expect(page).toHaveURL(/\/survey/);
  await expect(page.getByRole("radio", { name: "4 꽤 가깝다" })).toBeChecked();
});

test("result sections, separate relationship scores, intensity, ties and mobile layout", async ({ page }) => {
  const answers = Object.fromEntries(questions.map((q) => {
    const corrected = q.dimensionCode === "ANX" ? 5 : q.dimensionCode === "AVO" ? 1 : 3;
    return [q.id, q.reverse ? 6 - corrected : corrected];
  }));
  await page.addInitScript(({ key, answers }) => localStorage.setItem(key, JSON.stringify({ version: 1, answers, stage: "result", index: 107 })), { key: SESSION_KEY, answers });
  await page.goto("/result");
  await expect(page.getByRole("heading", { name: "지금의 나를 살펴보세요." })).toBeVisible();
  const sections = await page.locator("main > section").count();
  expect(sections).toBe(11);
  await expect(page.locator(".core-gap")).toContainText("두 성향이 근접");
  await expect(page.locator(".gap-value")).toHaveText("0점");
  const anxiety = page.locator("main > section").filter({ has: page.getByRole("heading", { name: "관계 변화 민감도", exact: true }) });
  const avoidance = page.locator("main > section").filter({ has: page.getByRole("heading", { name: "친밀감 거리두기", exact: true }) });
  await expect(anxiety.locator(".score-value")).toHaveText("100점");
  await expect(anxiety.locator(".intensity")).toHaveText("매우 높음");
  await expect(avoidance.locator(".score-value")).toHaveText("0점");
  await expect(avoidance.locator(".intensity")).toHaveText("낮음");
  await expect(page.locator("main")).not.toContainText(/CORE\d|에니어그램|Wing|통합|분열/);
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: test.info().outputPath("result.png"), fullPage: true });
});
