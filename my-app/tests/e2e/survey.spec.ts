import { test, expect } from "@playwright/test";
import questions from "../../src/data/questions.json";
import { SESSION_KEY } from "../../src/lib/survey-session";

test("selection, previous, refresh and browser history retain answers", async ({ page }) => {
  await page.goto("/assessment");
  const next = page.getByRole("button", { name: "다음 문항" });
  await expect(next).toBeDisabled();
  await expect(page.getByRole("radio")).toHaveCount(5);
  await page.locator(".answer-option").filter({ hasText: "꽤 가깝다" }).click();
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.locator(".question-number")).toContainText("문항 2");
  await expect(next).toBeDisabled();
  await page.locator(".answer-option").filter({ hasText: "매우 가깝다" }).click();
  await page.reload();
  await expect(page.getByRole("radio", { name: "5 매우 가깝다" })).toBeChecked();
  await page.goBack();
  await expect(page.locator(".question-number")).toContainText("문항 1");
  await expect(page.getByRole("radio", { name: "4 꽤 가깝다" })).toBeChecked();
  await page.goForward();
  await expect(page.getByRole("radio", { name: "5 매우 가깝다" })).toBeChecked();
  await page.getByRole("button", { name: "이전", exact: false }).click();
  await expect(page.getByRole("radio", { name: "4 꽤 가깝다" })).toBeChecked();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "2");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("survey.png"), fullPage: true });
});

test("108 answers submit through scoring, restore results, edit and restart", async ({ page }) => {
  await page.goto("/");
  for (let index = 0; index < 108; index++) {
    await expect(page.locator(".question-number")).toHaveText(`문항 ${index + 1} / 108`);
    await page.locator(".answer-option").filter({ hasText: "어느 쪽도 아니다" }).click();
    await page.getByRole("button", { name: index === 107 ? "응답 확인" : "다음 문항" }).click();
  }
  await expect(page.getByRole("heading", { name: "나의 응답이 모였어요." })).toBeVisible();
  await expect(page.locator(".review-grid button")).toHaveCount(108);
  await page.getByRole("button", { name: "결과 확인하기" }).click();
  await expect(page.getByRole("heading", { name: "지금의 나를 살펴보세요." })).toBeVisible();
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.locator(".dimension-score .score-value")).toHaveCount(27);
  await expect(page.locator(".dimension-score .score-value").first()).toHaveText("50점");
  await page.reload();
  await expect(page.locator(".dimension-score .score-value")).toHaveCount(27);
  await expect(page.locator(".quality-note")).toContainText("같은 응답이 전체의 90% 이상");
  await page.getByRole("button", { name: "응답 다시 살펴보기" }).click();
  await page.getByRole("button", { name: "1번 문항, 3점", exact: true }).click();
  await page.locator(".answer-option").filter({ hasText: "매우 가깝다" }).click();
  await page.goBack();
  await page.getByRole("button", { name: "결과 확인하기" }).click();
  await expect(page.getByText("62.5점", { exact: true })).toHaveCount(1);
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "다시 검사하기" }).click();
  await expect(page.locator(".result-panel")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "다시 검사하기" }).click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "0");
  await page.reload();
  await expect(page.getByRole("button", { name: "다음 문항" })).toBeDisabled();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).answers, SESSION_KEY)).toEqual({});
});

test("missing answers block submission even with stored review state", async ({ page }) => {
  await page.addInitScript(({ key, id }) => {
    localStorage.setItem(key, JSON.stringify({ version: 1, answers: { [id]: 3 }, index: 107, stage: "review" }));
  }, { key: SESSION_KEY, id: questions[0].id });
  await page.goto("/assessment");
  await page.getByRole("button", { name: "결과 확인하기" }).click();
  await expect(page.locator(".live-notice")).toContainText("107개 문항에 아직 답하지 않았어요");
  await expect(page.locator(".result-panel")).toHaveCount(0);
});

test("corrupt storage recovers safely and keyboard radios work", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "{bad json"), SESSION_KEY);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "다음 문항" })).toBeDisabled();
  await page.getByRole("radio", { name: "1 전혀 가깝지 않다" }).focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: "2 별로 가깝지 않다" })).toBeChecked();
  await expect(page.getByRole("button", { name: "다음 문항" })).toBeEnabled();
});

test("storage failure is visible without discarding in-memory answers", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("Blocked", "QuotaExceededError"); };
  });
  await page.goto("/");
  await page.locator(".answer-option").filter({ hasText: "꽤 가깝다" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "응답을 저장하지 못했어요" })).toBeVisible();
  await page.getByRole("button", { name: "다음 문항" }).click();
  await page.getByRole("button", { name: "이전" }).click();
  await expect(page.getByRole("radio", { name: "4 꽤 가깝다" })).toBeChecked();
});
