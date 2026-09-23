import assert from "node:assert/strict";
import { test } from "node:test";
import * as content from "../data/content";
import * as items from "../data/items";
import { CORE_TYPES } from "../types/assessment";
import { band, coreSentence, fillText, honorific, quadrant, selfMapAxes } from "./report";
import { scoreAssessment } from "./scoring";
import { makeAnswers } from "./test-fixtures";

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

/** 사용자 화면 금지어: 유형번호, Wing/윙/날개, 통합/분열, 내부 코드 */
const FORBIDDEN = [/\d\s*번\s*유형/, /유형\s*\d/, /wing/i, /윙/, /날개/, /통합/, /분열/, /\bT[1-9]\b/, /\bCORE[1-9]\b/];

test("사용자에게 보이는 문구에 금지어가 없다", () => {
  const userText = [...strings(content), ...items.ITEMS.flatMap((i) => (i.kind === "likert" ? [i.text, i.lead ?? ""] : [i.stem, ...i.options.map((o) => o.text)])), ...strings(items.PARTS)];
  for (const s of userText) for (const re of FORBIDDEN) assert.doesNotMatch(s, re, s);
});

test("문구의 치환 자리는 {nm}·{primary}만 쓴다", () => {
  for (const s of strings(content)) for (const m of s.matchAll(/\{(\w+)\}/g)) assert.ok(["nm", "primary"].includes(m[1]), s);
});

test("9개 Core 모두 필요한 문구를 갖추고 실험은 3개, 성찰 질문은 3개다", () => {
  for (const t of CORE_TYPES) {
    const c = content.CORE[t];
    assert.equal(c.growth.experiments.length, 3, t);
    assert.equal(c.growth.reflections.length, 3, t);
    assert.equal(c.healthy.cells.length, 3, t);
    assert.equal(c.stress.signals.length, 3, t);
    assert.ok(content.MESSAGES[t].text.length > 0);
  }
});

test("리포트 도우미", () => {
  assert.equal(honorific(""), "당신");
  assert.equal(honorific("수경"), "수경님");
  assert.equal(fillText("{nm}의 {x}", { nm: "당신" }), "당신의 {x}");
  assert.deepEqual([band(39.9), band(40), band(60), band(75)], ["낮음", "중간", "다소 높음", "높음"]);
  assert.deepEqual([quadrant(49, 49), quadrant(50, 10), quadrant(10, 50), quadrant(80, 80)], ["closeCalm", "closeWatch", "distCalm", "distWatch"]);
});

test("Core 문장은 판정 유보와 낮은 신뢰도에서 단정하지 않는다", () => {
  const undetermined = scoreAssessment(makeAnswers({ E07: { first: "A", second: "C" }, M1: 1 }));
  assert.match(coreSentence(undetermined, "당신"), /한 가지로 좁혀지지 않았어요/);
  const weak = scoreAssessment(makeAnswers({ M1: 1 }));
  assert.match(coreSentence(weak, "당신"), /가까워 보여요/);
  const strong = scoreAssessment(makeAnswers({ M1: 5 }));
  assert.match(coreSentence(strong, "당신"), /ORDER예요/);
});

test("Self Map은 여섯 Layer 값을 가진다", () => {
  const axes = selfMapAxes(scoreAssessment(makeAnswers()));
  assert.deepEqual(axes.map((a) => a.layer), ["core", "state", "rel", "pat", "str", "dir"]);
});
