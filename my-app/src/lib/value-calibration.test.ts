import assert from "node:assert/strict";
import { test } from "node:test";
import { ITEM_BANK_VERSION, PART1 } from "../data/items";
import { VALUE_CALIBRATION } from "../data/value-calibration";
import { VALUE_CODES, type Scores, type ValueCode } from "../types/assessment";
import {
  assertCalibration, rankCalibrated, rankGroups, standardizeValues, VALUE_CALIBRATION_METHOD, VALUE_TIE_TOLERANCE,
  ValueCalibrationMismatchError, valueLayoutDescriptor, valueLayoutFingerprint, VALUE_WEIGHTS, type ValueCalibration,
} from "./value-calibration";

const all = (x: number) => Object.fromEntries(VALUE_CODES.map((v) => [v, x])) as Scores<ValueCode>;
const scores = (part: Partial<Record<ValueCode, number>>, rest = -1) => ({ ...all(rest), ...part }) as Scores<ValueCode>;
const calibration = (over: Partial<ValueCalibration> = {}): ValueCalibration => ({
  method: VALUE_CALIBRATION_METHOD, fingerprint: valueLayoutFingerprint(), itemBankVersion: ITEM_BANK_VERSION,
  seed: 1, samples: 1, mean: all(48), sd: all(15), ...over,
});

test("배치 지문은 문항 버전·Part 1 맥락·보기별 가치 태그·배점 상한·결합 비중·보정 방식을 담고, 같은 배치에서 항상 같다", () => {
  const d = valueLayoutDescriptor();
  assert.ok(d.includes(`bank=${ITEM_BANK_VERSION}`));
  assert.ok(d.includes(`method=${VALUE_CALIBRATION_METHOD}`));
  assert.ok(d.includes(`weights=${VALUE_WEIGHTS.selection}/${VALUE_WEIGHTS.diversity}`));
  for (const item of PART1) assert.ok(d.includes(`${item.id}:${item.context}:${item.options.map((o) => `${o.key}=${o.value}`).join(",")}`));
  assert.equal(valueLayoutFingerprint(), valueLayoutFingerprint());
});

test("보정값이 현재 배치·문항 버전·보정 방식과 다르거나 표준편차가 0 이하면 조용히 쓰지 않고 오류를 낸다", () => {
  assert.doesNotThrow(() => assertCalibration(calibration()));
  const bad: Partial<ValueCalibration>[] = [
    { fingerprint: "00000000" }, { itemBankVersion: "0.0" }, { method: "other" }, { sd: { ...all(15), CONTR: 0 } },
  ];
  for (const over of bad) {
    assert.throws(() => assertCalibration(calibration(over)), ValueCalibrationMismatchError);
    assert.throws(() => standardizeValues(all(50), calibration(over)), ValueCalibrationMismatchError);
  }
});

test("표준화는 (결합 점수 − 무작위 평균) / 무작위 표준편차다", () => {
  const z = standardizeValues(scores({ EXP: 63 }, 48), calibration({ mean: { ...all(48), EXP: 49.4 }, sd: { ...all(15), EXP: 15.1 } }));
  assert.ok(Math.abs(z.EXP - (63 - 49.4) / 15.1) < 1e-12);
  assert.equal(z.ACH, 0);
});

test(`공동 1위는 최고 보정 점수와의 차이가 ${VALUE_TIE_TOLERANCE} 이하인 가치이며, 연쇄로 포함하지 않는다`, () => {
  // ACH와 AUT는 0.04 차이, AUT와 REL도 0.04 차이지만 REL은 최고점과 0.08 차이라 공동 1위가 아니다.
  const r = rankCalibrated(scores({ ACH: 1.0, AUT: 0.96, REL: 0.92 }));
  assert.deepEqual(r.first, ["ACH", "AUT"]);
  // 경계: 정확히 0.05 차이는 포함, 0.0501은 제외
  assert.deepEqual(rankCalibrated(scores({ ACH: 1.0, AUT: 0.95 })).first, ["ACH", "AUT"]);
  assert.deepEqual(rankCalibrated(scores({ ACH: 1.0, AUT: 0.9499 })).first, ["ACH"]);
});

test("상위 3은 3위 보정 점수를 기준으로 경계 공동을 함께 표시하고, 자리보다 후보가 많으면 경계 공동으로 알린다", () => {
  const r = rankCalibrated(scores({ ACH: 1.0, AUT: 0.8, REL: 0.5, SEC: 0.47, GROW: 0.44 }));
  assert.deepEqual(r.top3, ["ACH", "AUT", "REL", "SEC"]);
  assert.equal(r.boundaryTied, true);
  const clear = rankCalibrated(scores({ ACH: 1.0, AUT: 0.8, REL: 0.5, SEC: 0.3 }));
  assert.deepEqual(clear.top3, ["ACH", "AUT", "REL"]);
  assert.equal(clear.boundaryTied, false);
});

test("같은 측정 조건(같은 무작위 기준)에서 같은 결합 점수를 받은 두 가치는 공동이다", () => {
  const z = standardizeValues(scores({ ACH: 70, GROW: 70 }, 40), calibration());
  assert.deepEqual(rankCalibrated(z).first, ["ACH", "GROW"]);
});

test("측정 기회가 다른 두 가치(8번 중 6번 · 10번 중 6번)는 허용폭이 묶지 않는다", () => {
  // 선택 횟수는 같아도 Selection은 75와 60으로 다르고, 무작위 기준도 다르다(다양성 80으로 같다고 둠).
  const contr = VALUE_WEIGHTS.selection * 75 + VALUE_WEIGHTS.diversity * 80;
  const rel = VALUE_WEIGHTS.selection * 60 + VALUE_WEIGHTS.diversity * 80;
  const cal = calibration({ mean: { ...all(48), CONTR: 48.6, REL: 48.4 }, sd: { ...all(15), CONTR: 16.1, REL: 14.2 } });
  const z = standardizeValues(scores({ CONTR: contr, REL: rel }, 40), cal);
  assert.ok(z.CONTR - z.REL > VALUE_TIE_TOLERANCE);
  assert.deepEqual(rankCalibrated(z).first, ["CONTR"]);
});

test("같은 입력은 항상 같은 보정 순위를 낸다", () => {
  const z = standardizeValues(scores({ ACH: 70, EXP: 69.5, REL: 66 }, 40), calibration());
  assert.deepEqual(rankCalibrated(z), rankCalibrated(z));
});

test("앱에 저장된 보정값은 현재 문항 배치·문항 버전·보정 방식과 일치한다(문항을 바꾸면 make-value-calibration을 다시 실행)", () => {
  assert.doesNotThrow(() => assertCalibration(VALUE_CALIBRATION));
  assert.ok(VALUE_CALIBRATION.samples >= 10000);
});

test("공동 순위 번호: 그룹 첫 가치와 허용폭 이내면 같은 순위, 연쇄 포함 없음, 앞선 가치 수 + 1", () => {
  const { rank, groups } = rankGroups(scores({ ACH: 1.0, AUT: 0.96, REL: 0.92, SEC: 0.5 }, -1));
  assert.deepEqual(groups.slice(0, 3), [["ACH", "AUT"], ["REL"], ["SEC"]]);
  assert.equal(rank.ACH, 1);
  assert.equal(rank.AUT, 1);
  assert.equal(rank.REL, 3);
  assert.equal(rank.SEC, 4);
  // 나머지 넷(-1)은 모두 공동 5위
  assert.deepEqual(VALUE_CODES.filter((v) => rank[v] === 5), ["GROW", "AUTH", "CONTR", "EXP"]);
});
