import assert from "node:assert/strict";
import { test } from "node:test";
import { buildNarrativeInput, NARRATIVE_FIELDS, NARRATIVE_SCHEMA, narrativePrompt, validateNarrative } from "./narrative";
import { scoreAssessment } from "./scoring";
import { makeAnswers } from "./test-fixtures";

const result = scoreAssessment(makeAnswers());
const input = buildNarrativeInput(result);
const good = "{nm}을 가장 자주 움직이는 건 옳게 해내고 싶은 마음이에요. ORDER의 기준은 일을 단단하게 만들지만, 요즘처럼 평소의 자리에 있을 때는 그 기준이 나를 돕는지 몰아세우는지 가끔 살펴봐도 좋아요.";
const all = (text: string) => Object.fromEntries(NARRATIVE_FIELDS.map((f) => [f, text]));

test("AI 입력에는 내부 코드와 원응답·점수 숫자가 없다", () => {
  // 제안할 실험 개수(0·2·3)만 숫자로 허용한다.
  const json = JSON.stringify({ ...input, growth: { ...input.growth, experimentsOffered: null } });
  assert.doesNotMatch(json, /\bT[1-9]\b|"(SS|US|AS|ABN|ANX|AVO|ST[1-6]|SC[1-6])"|\d/);
  assert.deepEqual(input.allowedCoreNames.sort(), ["CARE", "DRIVE", "ORDER"].sort());
  assert.ok(narrativePrompt(input).includes("ORDER"));
});

test("스키마는 모든 필드를 요구하고 추가 필드를 막는다", () => {
  assert.deepEqual(NARRATIVE_SCHEMA.required, [...NARRATIVE_FIELDS]);
  assert.equal(NARRATIVE_SCHEMA.additionalProperties, false);
});

test("검증을 통과한 문단만 채택한다", () => {
  const { narrative, rejected } = validateNarrative(all(good), input);
  assert.equal(Object.keys(narrative).length, NARRATIVE_FIELDS.length);
  assert.deepEqual(rejected, []);
});

test("점수·진단·성장환경·금지어·근거 없는 Core·다른 호칭은 거부한다", () => {
  const cases: [string, string][] = [
    [good + " 점수는 75점이에요.", "숫자(점수 변경 방지)"],
    [good + " 불안장애일 가능성이 있어요.", "진단·치료 표현"],
    [good + " 어린 시절의 경험 때문일 수 있어요.", "성장환경 추정"],
    [good + " 날개의 영향도 보여요.", "금지 용어"],
    [good + " 그래서 FLOW의 모습도 있어요.", "근거 없는 Core"],
    [good.replace("{nm}을", "당신을"), "다른 호칭"],
    [good + " 남들보다 기준이 높아요.", "비교·순위 표현"],
    ["짧아요.", "길이"],
  ];
  for (const [text, reason] of cases) {
    const { narrative, rejected } = validateNarrative({ ...all(good), summary: text }, input);
    assert.equal(narrative.summary, undefined, text);
    assert.deepEqual(rejected, [{ field: "summary", reason }], text);
  }
});

test("잘못된 형식은 모든 필드를 거부한다", () => {
  assert.equal(validateNarrative(null, input).rejected.length, NARRATIVE_FIELDS.length);
  assert.equal(validateNarrative({ summary: 3 }, input).rejected.length, NARRATIVE_FIELDS.length);
});

test("보호 상태(실험 0개)에서는 과제·실험 제안을 거부한다", () => {
  const low = { ...input, growth: { ...input.growth, experimentsOffered: 0 as const } };
  const { rejected } = validateNarrative({ ...all(good), letter: good + " 이번 주에 작은 실험을 해보세요." }, low);
  assert.deepEqual(rejected, [{ field: "letter", reason: "보호 상태에서 과제 제안" }]);
});
