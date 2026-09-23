import { expect, test, type Page } from "@playwright/test";
import { DISPLAY_ORDER, ITEM_BY_ID } from "../../src/data/items";

const KEY = "self-layers:v1.0:session";
const FORBIDDEN = /\d\s*번\s*유형|유형\s*\d|wing|윙|날개|통합|분열|\bT[1-9]\b|\bCORE[1-9]\b/i;

function fullAnswers() {
  const answers: Record<string, unknown> = {};
  for (const id of DISPLAY_ORDER) {
    const item = ITEM_BY_ID.get(id)!;
    answers[id] = item.kind === "choice" ? { first: "B", second: "A" } : item.kind === "rank" ? ["B", "A", "C"] : (id.length % 5) + 1;
  }
  return answers;
}

async function seed(page: Page, data: object) {
  await page.goto("/survey");
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify({ version: 2, name: "", index: 0, stage: "intro", completedAt: null, ...data })] as const);
}

test("76문항 전체를 화면에서 응답하고 결과 리포트를 본다", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/survey");
  await page.getByLabel(/리포트에 표시할 이름/).fill("수경");
  await page.getByRole("button", { name: /검사 시작하기/ }).click();

  for (let i = 0; i < DISPLAY_ORDER.length; i++) {
    const item = ITEM_BY_ID.get(DISPLAY_ORDER[i])!;
    await expect(page).toHaveURL(new RegExp(`#q${i + 1}$`));
    if (item.kind === "choice") {
      const next = page.getByRole("button", { name: "다음", exact: true });
      await expect(next).toBeDisabled();
      const opts = page.locator(".options button");
      await opts.nth(i % 3).click();
      await opts.nth((i + 1) % 3).click();
      await expect(page.locator(".opt.on")).toHaveCount(2);
      await next.click();
    } else if (item.kind === "likert") {
      await page.locator(".options label").nth(i % 5).click();
      await expect(page).toHaveURL(new RegExp(`#q${i + 2}$`)); // 포인터 선택은 자동으로 다음 문항으로 이동
    } else {
      const opts = page.locator(".options button");
      await opts.nth(2).click();
      await opts.nth(0).click();
      await expect(page.locator(".opt.on")).toHaveCount(3);
      await page.getByRole("button", { name: "응답 확인" }).click();
    }
  }

  await expect(page.getByRole("heading", { name: "모든 응답이 모였어요" })).toBeVisible();
  await page.getByRole("button", { name: /결과 리포트 보기/ }).click();
  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByRole("heading", { name: /My Core/ })).toBeVisible();
  for (const id of ["summary", "map", "state", "modes", "message", "relationship", "pattern", "stress", "direction", "cross", "growth", "letter"]) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await expect(page.locator(".cover")).toContainText("수경");
  expect(await page.locator("body").innerText()).not.toMatch(FORBIDDEN);
});

test("응답은 새로고침 후에도 유지되고, 이어서 하기는 첫 미응답 문항으로 간다", async ({ page }) => {
  await page.goto("/survey");
  await page.getByRole("button", { name: /검사 시작하기/ }).click();
  const opts = page.locator(".options button");
  await opts.nth(0).click();
  await opts.nth(1).click();
  await page.getByRole("button", { name: "다음", exact: true }).click();
  await expect(page).toHaveURL(/#q2$/);
  await page.reload();
  await expect(page).toHaveURL(/#q2$/);
  await page.getByRole("button", { name: "이전", exact: true }).click();
  await expect(page.locator(".opt.on")).toHaveCount(2);
  await page.goto("/survey#start");
  await page.reload();
  await page.getByRole("button", { name: /이어서 하기 \(1\/76\)/ }).click();
  await expect(page).toHaveURL(/#q2$/);
});

test("1순위를 다시 누르면 취소되고 남은 선택이 1순위가 된다", async ({ page }) => {
  await page.goto("/survey#q1");
  await page.reload();
  const opts = page.locator(".options button");
  await opts.nth(0).click();
  await opts.nth(2).click();
  await opts.nth(0).click();
  await expect(opts.nth(2)).toHaveAttribute("aria-label", /1순위로 선택됨/);
  await expect(page.getByRole("button", { name: "다음", exact: true })).toBeDisabled();
});

test("키보드로 고른 5점 응답은 자동으로 넘어가지 않는다", async ({ page }) => {
  await seed(page, { stage: "question", index: 18 });
  await page.goto("/survey#q19");
  await page.reload();
  await expect(page.locator("h1.q-title")).toBeVisible(); // 저장값 복구(하이드레이션) 완료 후 조작
  const radio = page.getByRole("radio", { name: /보통이다/ });
  await radio.focus();
  await page.keyboard.press("Space");
  await expect(radio).toBeChecked();
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/#q19$/);
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: /그런 편이다/ })).toBeChecked();
  await expect(page).toHaveURL(/#q19$/);
});

test("미응답이 있으면 제출하지 않고 확인 화면에 남는다", async ({ page }) => {
  const answers = fullAnswers();
  delete answers.P5;
  await seed(page, { answers, stage: "review" });
  await page.goto("/survey#review");
  await page.reload();
  await expect(page.getByRole("heading", { name: "아직 남은 문항이 있어요" })).toBeVisible();
  await page.getByRole("button", { name: /결과 리포트 보기/ }).click();
  await expect(page.getByRole("status")).toContainText("1개 문항이 남아 있어요");
  await page.getByRole("button", { name: /미응답/ }).click();
  await expect(page.getByRole("heading", { name: /갈등이|계획과 다르게/ })).toBeVisible();
});

test("결과 리포트: 저장된 응답이 없으면 안내를 보여준다", async ({ page }) => {
  await page.goto("/result");
  await expect(page.getByRole("heading", { name: "아직 볼 수 있는 리포트가 없어요" })).toBeVisible();
});

test("결과 리포트는 가로 스크롤이 없고 금지어를 노출하지 않는다", async ({ page }) => {
  await seed(page, { answers: fullAnswers(), completedAt: "2026-09-23T03:00:00.000Z" });
  await page.goto("/result");
  await expect(page.getByRole("heading", { name: /My Core/ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  expect(await page.locator("body").innerText()).not.toMatch(FORBIDDEN);
});

test("검사 화면은 가로 스크롤이 없다", async ({ page }) => {
  await page.goto("/survey");
  for (const hash of ["#start", "#q1", "#q20", "#q76", "#review"]) {
    await page.goto(`/survey${hash}`);
    await page.reload();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, hash).toBeLessThanOrEqual(0);
  }
});

test("AI 문장화: 버튼을 눌러야 호출되고, 적용·전환·실패 시 기본 문장 유지", async ({ page }) => {
  const text = "{nm}을 움직이는 건 옳게 해내고 싶은 마음이에요. 기준은 일을 단단하게 만들지만, 요즘은 그 기준이 나를 돕는지 몰아세우는지 가끔 살펴봐도 좋아요.";
  let calls = 0, body: { answers?: unknown; name?: unknown } = {};
  await page.route("**/api/narrative", async (route) => {
    calls++;
    body = route.request().postDataJSON();
    await route.fulfill({ json: { narrative: { summary: text, letter: text }, rejected: [{ field: "core", reason: "숫자(점수 변경 방지)" }] } });
  });
  await seed(page, { name: "수경", answers: fullAnswers(), completedAt: "2026-09-23T03:00:00.000Z" });
  await page.goto("/result");
  await expect(page.getByRole("heading", { name: /My Core/ })).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "AI 문장으로 다듬기" }).click();
  await expect(page.locator('[data-ai="summary"]')).toContainText("수경님을 움직이는 건");
  expect(calls).toBe(1);
  expect(body.name).toBeUndefined();
  await expect(page.locator(".ai-panel")).toContainText("2개 문단");
  await expect(page.locator(".ai-panel")).toContainText("1개 문단은 기본 문장을 유지");
  await page.getByRole("button", { name: "기본 문장으로 보기" }).click();
  await expect(page.locator("[data-ai]")).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-ai="letter"]')).toBeVisible(); // 같은 응답이면 저장된 AI 문장을 다시 쓴다
  expect(calls).toBe(1);
  expect(await page.locator("body").innerText()).not.toMatch(FORBIDDEN);
});

test("AI 문장화: 서버에 자격 증명이 없으면 안내하고 기본 문장을 유지한다", async ({ page }) => {
  await page.route("**/api/narrative", (route) => route.fulfill({ status: 503, json: { error: "ai_unavailable" } }));
  await seed(page, { answers: fullAnswers(), completedAt: "2026-09-23T03:00:00.000Z" });
  await page.goto("/result");
  await page.getByRole("button", { name: "AI 문장으로 다듬기" }).click();
  await expect(page.locator(".ai-panel [role=alert]")).toContainText("사용할 수 없어요");
  await expect(page.locator("[data-ai]")).toHaveCount(0);
  await expect(page.locator("#summary")).toContainText("또 하나의 큰 힘");
});
