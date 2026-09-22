import assert from "node:assert/strict";
import { test } from "node:test";
import questions from "../data/questions.json";
import { correctAnswer, scoreSurvey } from "./scoring";
import { analyzeResults, rankDimensions } from "./result-analysis";
import type { DimensionCode, SurveyAnswers, SurveyAnswerValue } from "../types/survey";
import type { SurveyScore } from "../types/result";

function rawAnswers(value: SurveyAnswerValue = 3): SurveyAnswers {
  return Object.fromEntries(questions.map((q) => [q.id, value]));
}

/** Hand-chosen corrected scores mapped back into raw answers via source flags. */
function setDimension(answers: SurveyAnswers, code: DimensionCode, values: (SurveyAnswerValue | undefined)[]) {
  const group = questions.filter((q) => q.dimensionCode === code);
  assert.equal(group.length, 4);
  assert.equal(values.length, 4);
  group.forEach((q, index) => {
    const value = values[index];
    if (value === undefined) delete answers[q.id];
    else answers[q.id] = (q.reverse ? 6 - value : value) as SurveyAnswerValue;
  });
}

/** Isolates rank/threshold logic from the discrete score increments of 4 items. */
function withScores(overrides: Partial<Record<DimensionCode, number>>): SurveyScore {
  const result = scoreSurvey(rawAnswers());
  for (const [code, score] of Object.entries(overrides)) {
    const dimension = result.dimensions[code as DimensionCode];
    result.dimensions[code as DimensionCode] = { ...dimension, status: "scored", score, mean: 1 + score / 25 };
  }
  return result;
}

test("all five normal and reverse responses follow the exact mapping", () => {
  for (const value of [1, 2, 3, 4, 5]) {
    assert.equal(correctAnswer(value, false), value);
    assert.equal(correctAnswer(value, true), 6 - value);
  }
});

for (const invalid of [0, 6, -1, 1.5, NaN, Infinity, "3", null, true]) {
  test(`rejects invalid response ${String(invalid)} (${typeof invalid})`, () => {
    assert.throws(() => scoreSurvey({ [questions[0].id]: invalid } as SurveyAnswers), RangeError);
    assert.throws(() => correctAnswer(invalid as number, false), RangeError);
  });
}

test("rejects unknown IDs, including unknown IDs with undefined values", () => {
  assert.throws(() => scoreSurvey({ unknown: 3 }), /알 수 없는/);
  assert.throws(() => scoreSurvey({ unknown: undefined }), /알 수 없는/);
});

test("rejects non-object answer payloads", () => {
  for (const value of [null, undefined, [], "answers", 1]) {
    assert.throws(() => scoreSurvey(value as unknown as SurveyAnswers), TypeError);
  }
});

test("real source flags are applied before averaging; ID differs from displayOrder", () => {
  const answers = rawAnswers();
  answers["C-CORE1-01"] = 1;
  answers["C-CORE1-02"] = 2;
  answers["C-CORE1-03"] = 1; // source Y => 5
  answers["C-CORE1-04"] = 4; // source N => 4, preserved despite wording
  const dimension = scoreSurvey(answers).dimensions.CORE1;
  assert.equal(dimension.mean, 3); // (1 + 2 + 5 + 4) / 4
  assert.equal(dimension.score, 50);
  assert.equal(questions.find((q) => q.id === "C-CORE1-03")?.displayOrder, 53);
});

for (const [value, expected] of [[1, 0], [3, 50], [5, 100]] as const) {
  test(`corrected mean ${value} converts to ${expected} in every dimension`, () => {
    const answers: SurveyAnswers = {};
    for (const q of questions) answers[q.id] = (q.reverse ? 6 - value : value) as SurveyAnswerValue;
    const result = scoreSurvey(answers);
    assert.equal(Object.keys(result.dimensions).length, 27);
    for (const dimension of Object.values(result.dimensions)) {
      assert.equal(dimension.status, "scored");
      assert.equal(dimension.mean, value);
      assert.equal(dimension.score, expected);
      assert.equal(dimension.answeredCount, 4);
      assert.equal(dimension.missingCount, 0);
    }
  });
}

test("one missing response averages three corrected answers without rounding", () => {
  const answers = rawAnswers();
  setDimension(answers, "CORE1", [1, 2, 4, undefined]);
  const result = scoreSurvey(answers).dimensions.CORE1;
  assert.equal(result.status, "scored");
  assert.equal(result.mean, 7 / 3);
  assert.equal(result.score, (7 / 3 - 1) / 4 * 100);
  assert.equal(result.answeredCount, 3);
  assert.equal(result.missingCount, 1);
});

test("explicit undefined and absent keys have the same missing behavior", () => {
  assert.deepEqual(scoreSurvey({ [questions[0].id]: undefined }), scoreSurvey({}));
});

for (const count of [0, 1, 2]) {
  test(`${count} answered items leave the dimension pending, never zero`, () => {
    const answers = rawAnswers();
    setDimension(answers, "CORE1", Array.from({ length: 4 }, (_, index) => index < count ? 5 : undefined));
    const dimension = scoreSurvey(answers).dimensions.CORE1;
    assert.equal(dimension.status, "pending");
    assert.equal(dimension.mean, null);
    assert.equal(dimension.score, null);
    assert.equal(dimension.answeredCount, count);
    assert.equal(dimension.missingCount, 4 - count);
  });
}

test("all missing answers return pending dimensions, no ranks or fabricated gap", () => {
  const result = scoreSurvey({});
  const analysis = analyzeResults(result);
  assert.ok(Object.values(result.dimensions).every((d) => d.status === "pending"));
  assert.equal(analysis.core.status, "unavailable");
  assert.deepEqual(analysis.core.items, []);
  assert.equal(analysis.core.topTwoGap, null);
  assert.equal(analysis.core.isClose, null);
  assert.deepEqual(analysis.pattern.top, []);
  assert.deepEqual(analysis.direction.top, []);
  assert.equal(analysis.relationship.ANX.status, "pending");
  assert.deepEqual(result.quality.warnings, []);
  assert.equal(result.quality.missingCount, 108);
});

test("CORE1..9 are ranked descending by score, preserving nonadjacent ID order", () => {
  const analysis = analyzeResults(withScores({
    CORE1: 10, CORE2: 80, CORE3: 40, CORE4: 30, CORE5: 60,
    CORE6: 20, CORE7: 90, CORE8: 70, CORE9: 50,
  }));
  assert.deepEqual(analysis.core.items.map((d) => d.code), ["CORE7", "CORE2", "CORE8", "CORE5", "CORE9", "CORE3", "CORE4", "CORE6", "CORE1"]);
  assert.deepEqual(analysis.core.items.map((d) => d.rank), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(analysis.core.topTwoGap, 10);
  assert.equal(analysis.core.isClose, false);
});

for (const [gap, close] of [[0, true], [4.999, true], [5, false], [5.001, false]] as const) {
  test(`CORE gap ${gap}: isClose=${close}`, () => {
    const analysis = analyzeResults(withScores({ CORE1: 100, CORE2: 100 - gap }));
    assert.ok(Math.abs(analysis.core.topTwoGap! - gap) < 1e-10);
    assert.equal(analysis.core.isClose, close);
  });
}

test("one missing item can produce a real nonzero CORE gap below five", () => {
  const answers = rawAnswers();
  setDimension(answers, "CORE1", [4, 4, 4, 3]); // 68.75
  setDimension(answers, "CORE2", [4, 4, 3, undefined]); // 66.666...
  const analysis = analyzeResults(scoreSurvey(answers));
  assert.ok(analysis.core.topTwoGap! > 0 && analysis.core.topTwoGap! < 5);
  assert.equal(analysis.core.isClose, true);
});

test("ties use competition ranks and retain all tied CORE leaders", () => {
  const analysis = analyzeResults(withScores({ CORE1: 90, CORE3: 90, CORE2: 80 }));
  assert.deepEqual(analysis.core.items.slice(0, 3).map((d) => [d.code, d.rank]), [["CORE1", 1], ["CORE3", 1], ["CORE2", 3]]);
  assert.equal(analysis.core.topTwoGap, 0);
  assert.equal(analysis.core.isClose, true);
});

test("neutral answers tie all CORE, PATTERN and DIRECTION dimensions", () => {
  const analysis = analyzeResults(scoreSurvey(rawAnswers()));
  assert.ok(analysis.core.items.every((d) => d.rank === 1));
  assert.equal(analysis.pattern.top.length, 8);
  assert.equal(analysis.direction.top.length, 8);
  assert.ok(analysis.direction.top.every((d) => d.rank === 1));
  assert.deepEqual(analysis.pattern.representative, []);
});

test("PATTERN and DIRECTION include every tied third place", () => {
  const analysis = analyzeResults(withScores({ AS: 90, US: 80, DEF: 70, SS: 70, GROW: 90, AUT: 80, ACH: 70, AUTH: 70 }));
  assert.deepEqual(analysis.pattern.top.map((d) => [d.code, d.rank]), [["AS", 1], ["US", 2], ["DEF", 3], ["SS", 3]]);
  assert.deepEqual(analysis.direction.top.map((d) => [d.code, d.rank]), [["GROW", 1], ["AUT", 2], ["ACH", 3], ["AUTH", 3]]);
});

test("unshared top three return three items; representative threshold includes exactly 60", () => {
  const analysis = analyzeResults(withScores({ AS: 90, US: 60, DEF: 59.99, GROW: 90, AUT: 80, ACH: 70 }));
  assert.deepEqual(analysis.pattern.top.map((d) => d.code), ["AS", "US", "DEF"]);
  assert.deepEqual(analysis.pattern.representative.map((d) => d.code), ["AS", "US"]);
  assert.deepEqual(analysis.direction.top.map((d) => d.code), ["GROW", "AUT", "ACH"]);
});

test("pending dimensions are excluded, listed explicitly, and CORE comparison is deferred", () => {
  const answers = rawAnswers();
  for (const code of ["CORE1", "AS", "GROW"] as const) setDimension(answers, code, [5, 5, undefined, undefined]);
  const analysis = analyzeResults(scoreSurvey(answers));
  for (const [ranking, code] of [[analysis.core, "CORE1"], [analysis.pattern, "AS"], [analysis.direction, "GROW"]] as const) {
    assert.equal(ranking.status, "partial");
    assert.deepEqual(ranking.pendingCodes, [code]);
    assert.ok(ranking.items.every((d) => d.code !== code));
  }
  assert.equal(analysis.core.topTwoGap, null);
  assert.equal(analysis.core.isClose, null);
});

test("ANX and AVO have independent scores and missing states", () => {
  const answers = rawAnswers();
  setDimension(answers, "ANX", [5, 5, 5, 5]);
  setDimension(answers, "AVO", [1, 1, 1, 1]);
  const relationship = analyzeResults(scoreSurvey(answers)).relationship;
  assert.equal(relationship.ANX.score, 100);
  assert.equal(relationship.AVO.score, 0);
  setDimension(answers, "AVO", [1, 1, undefined, undefined]);
  const partial = analyzeResults(scoreSurvey(answers)).relationship;
  assert.equal(partial.ANX.score, 100);
  assert.equal(partial.AVO.status, "pending");
});

for (const count of [97, 98]) {
  test(`uniform raw responses ${count}/108 follow the 90% boundary`, () => {
    const answers = Object.fromEntries(questions.map((q, index) => [q.id, index < count ? 3 : index % 2 ? 2 : 4]));
    const quality = scoreSurvey(answers as SurveyAnswers).quality;
    assert.equal(quality.mostFrequentCount, count);
    assert.equal(quality.uniformRatio, count / 108);
    assert.equal(quality.warnings.includes("uniform-responses"), count === 98);
    assert.equal(quality.warnings.includes("extreme-responses"), false);
  });
  test(`combined 1/5 responses ${count}/108 follow the 90% boundary`, () => {
    const answers = Object.fromEntries(questions.map((q, index) => [q.id, index < count ? index % 2 ? 1 : 5 : 3]));
    const quality = scoreSurvey(answers as SurveyAnswers).quality;
    assert.equal(quality.extremeCount, count);
    assert.equal(quality.extremeRatio, count / 108);
    assert.equal(quality.warnings.includes("extreme-responses"), count === 98);
    assert.equal(quality.warnings.includes("uniform-responses"), false);
  });
}

test("missing responses stay in the quality denominator", () => {
  const answers = Object.fromEntries(questions.slice(0, 97).map((q) => [q.id, 5])) as SurveyAnswers;
  const quality = scoreSurvey(answers).quality;
  assert.equal(quality.answeredCount, 97);
  assert.equal(quality.missingCount, 11);
  assert.equal(quality.uniformRatio, 97 / 108);
  assert.equal(quality.extremeRatio, 97 / 108);
  assert.deepEqual(quality.warnings, []);
});

test("quality uses raw responses, not reverse-adjusted values", () => {
  const answers = Object.fromEntries(questions.map((q) => [q.id, q.reverse ? 1 : 5])) as SurveyAnswers;
  const result = scoreSurvey(answers);
  assert.ok(Object.values(result.dimensions).every((d) => d.score === 100));
  assert.deepEqual(result.quality.warnings, ["extreme-responses"]);
});

test("quality warnings coexist and do not invalidate or discard scores", () => {
  const result = scoreSurvey(rawAnswers(5));
  assert.deepEqual(result.quality.warnings, ["uniform-responses", "extreme-responses"]);
  assert.ok(Object.values(result.dimensions).every((d) => d.status === "scored"));
  assert.equal(result.dimensions.CORE1.score, 75); // three N=5, one Y=1
  assert.equal(analyzeResults(result).core.items.length, 9);
});

test("same input yields identical output and scoring/analysis never mutate inputs", () => {
  const answers = Object.freeze(rawAnswers());
  const before = JSON.stringify(answers);
  const result = scoreSurvey(answers);
  assert.deepEqual(scoreSurvey(answers), result);
  assert.equal(JSON.stringify(answers), before);
  for (const dimension of Object.values(result.dimensions)) Object.freeze(dimension);
  Object.freeze(result.dimensions);
  Object.freeze(result);
  const saved = JSON.stringify(result);
  assert.deepEqual(analyzeResults(result), analyzeResults(result));
  assert.equal(JSON.stringify(result), saved);
  const scores = Object.freeze(Object.values(result.dimensions));
  assert.equal(rankDimensions(scores).items.length, 27);
  assert.equal(JSON.stringify(result), saved);
});
