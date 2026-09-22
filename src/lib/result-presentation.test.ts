import assert from "node:assert/strict";
import { test } from "node:test";
import { buildResultPresentation, intensity } from "./result-presentation";
import { scoreSurvey } from "./scoring";
import questions from "../data/questions.json";

test("temporary intensity boundaries use original precision", () => {
  for (const [score, expected] of [[0, "낮음"], [39.999, "낮음"], [40, "보통"], [59.999, "보통"], [60, "높음"], [74.999, "높음"], [75, "매우 높음"], [100, "매우 높음"]] as const) assert.equal(intensity(score), expected);
  for (const score of [-1, 101, NaN, Infinity]) assert.throws(() => intensity(score), RangeError);
});
test("layer means and shared leaders are preserved without choosing a winner", () => {
  const score = scoreSurvey(Object.fromEntries(questions.map((q) => [q.id, 3 as const])));
  const report = buildResultPresentation(score);
  assert.equal(report.primary.length, 9);
  assert.equal(report.secondary.length, 0);
  assert.ok(report.layers.every((layer) => layer.score === 50));
  assert.match(report.sentence, /여러 중심 성향/);
  assert.doesNotMatch(report.sentence, /CORE\d|Wing|통합|분열/);
});
test("unique primary and secondary and truthful core/value sentence", () => {
  const score = scoreSurvey(Object.fromEntries(questions.map((q) => [q.id, 3 as const])));
  score.dimensions.CORE1 = { ...score.dimensions.CORE1, status: "scored", score: 100, mean: 5 };
  score.dimensions.CORE2 = { ...score.dimensions.CORE2, status: "scored", score: 75, mean: 4 };
  score.dimensions.AUT = { ...score.dimensions.AUT, status: "scored", score: 100, mean: 5 };
  const report = buildResultPresentation(score);
  assert.deepEqual(report.primary.map((d) => d.code), ["CORE1"]);
  assert.deepEqual(report.secondary.map((d) => d.code), ["CORE2"]);
  assert.equal(report.layers.find((l) => l.area === "CORE")?.score, 525 / 9);
  assert.match(report.sentence, /기준·개선/);
  assert.match(report.sentence, /자율/);
});
