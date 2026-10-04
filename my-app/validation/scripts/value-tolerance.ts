// B안(결합 점수 표준화)의 허용폭·보정 시드 영향 비교. 앱의 src/lib/value-calibration.ts를 그대로 쓴다. 검증용 집계.
// 사용: node validation/run.mjs value-tolerance [보정 표본=20000] [평가 표본=10000]
import { ITEM_BANK_VERSION, PART1 } from "../../src/data/items";
import { SCORING_VERSION, scoreAssessment } from "../../src/lib/scoring";
import { rankCalibrated, standardizeValues, VALUE_CALIBRATION_METHOD, valueLayoutFingerprint, type ValueCalibration } from "../../src/lib/value-calibration";
import { VALUE_CODES, type Answers, type ChoiceAnswer, type OptionKey, type Scores, type ValueCode } from "../../src/types/assessment";
import { generate, mulberry32, shuffle, type Rng } from "./generators";
import { vpath, writeJson, writeText } from "./common";

const N_CAL = Number(process.argv[2] ?? 20000);
const N_EVAL = Number(process.argv[3] ?? 10000);
const CAL_SEEDS = [777001, 888001, 999001];
const EVAL_SEEDS = [31000, 38919, 46838];
const TOLS = [0.025, 0.05, 0.1];
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

function buildCalibration(seed: number): ValueCalibration {
  const rng = mulberry32(seed), xs = Object.fromEntries(VALUE_CODES.map((v) => [v, [] as number[]])) as Record<ValueCode, number[]>;
  for (let k = 0; k < N_CAL; k++) { const { values } = scoreAssessment(generate("uniform", rng)); for (const v of VALUE_CODES) xs[v].push(values.score[v]); }
  const m = Object.fromEntries(VALUE_CODES.map((v) => [v, mean(xs[v])])) as Scores<ValueCode>;
  const sd = Object.fromEntries(VALUE_CODES.map((v) => [v, Math.sqrt(mean(xs[v].map((x) => (x - m[v]) ** 2)))])) as Scores<ValueCode>;
  return { method: VALUE_CALIBRATION_METHOD, fingerprint: valueLayoutFingerprint(), itemBankVersion: ITEM_BANK_VERSION, seed, samples: N_CAL, mean: m, sd };
}
const cals = CAL_SEEDS.map(buildCalibration);
const cal = cals[0];

// 사례 생성(value-calibration.ts와 같은 규칙: 해당 가치가 나온 문항의 70%에서 선택)
const PICK = 0.7;
const keyOf = (item: (typeof PART1)[number], v: ValueCode) => item.options.find((o) => o.value === v)?.key;
function withPart1(rng: Rng, choose: (item: (typeof PART1)[number]) => ChoiceAnswer): Answers {
  const a = generate("uniform", rng) as Record<string, unknown>;
  for (const item of PART1) a[item.id] = choose(item);
  return a as Answers;
}
function picks(rng: Rng, targets: ValueCode[]): Answers {
  return withPart1(rng, (item) => {
    const keys = item.options.map((o) => o.key);
    const chosen = targets.map((t) => keyOf(item, t)).filter((k): k is OptionKey => !!k && rng() < PICK);
    const rest = shuffle(rng, keys.filter((x) => !chosen.includes(x)));
    const [first, second] = shuffle(rng, [...chosen, ...rest].slice(0, 2));
    return { first, second };
  });
}

type Row = { tol: number; t1: Record<ValueCode, number>; t3: Record<ValueCode, number>; tie1: number; tie3: number; same: number; soloToCo: number; replaced: number; coToSolo: number };
const rows: Row[] = TOLS.map((tol) => ({ tol, t1: Object.fromEntries(VALUE_CODES.map((v) => [v, 0])) as Record<ValueCode, number>, t3: Object.fromEntries(VALUE_CODES.map((v) => [v, 0])) as Record<ValueCode, number>, tie1: 0, tie3: 0, same: 0, soloToCo: 0, replaced: 0, coToSolo: 0 }));
let calFlip = 0, total = 0;
for (const seed of EVAL_SEEDS) {
  const rng = mulberry32(seed);
  for (let k = 0; k < N_EVAL; k++) {
    const { values } = scoreAssessment(generate("uniform", rng));
    const engineFirst = [...VALUE_CODES].sort((a, b) => values.score[b] - values.score[a])[0]; // 보정 전 기준선
    total++;
    const z = standardizeValues(values.score, cal);
    for (const row of rows) {
      const r = rankCalibrated(z, row.tol);
      for (const v of r.first) row.t1[v] += 1 / r.first.length;
      // 상위 3 몫: 3위 점수보다 허용폭 넘게 높은 가치는 1, 경계 공동은 남은 자리를 나눔
      const third = z[r.ranking[2]], sure = r.top3.filter((v) => z[v] - third > row.tol + 1e-9), boundary = r.top3.filter((v) => !sure.includes(v));
      for (const v of sure) row.t3[v]++;
      for (const v of boundary) row.t3[v] += (3 - sure.length) / boundary.length;
      if (r.first.length > 1) row.tie1++;
      if (r.boundaryTied) row.tie3++;
      if (!r.first.includes(engineFirst)) row.replaced++;
      else if (r.first.length > 1) row.soloToCo++;
      else row.same++;
    }
    const a = rankCalibrated(standardizeValues(values.score, cals[0])).first, b = rankCalibrated(standardizeValues(values.score, cals[1])).first;
    if (a.length !== b.length || a.some((v) => !b.includes(v))) calFlip++;
  }
}

// 단일·복수 선호 사례
const caseRng = mulberry32(424242);
const single = TOLS.map(() => ({ inFirst: 0, alone: 0, n: 0 }));
const pair = TOLS.map(() => ({ bothFirst: 0, bothTop3: 0, n: 0 }));
for (const v of VALUE_CODES) for (let k = 0; k < 300; k++) {
  const { values } = scoreAssessment(picks(caseRng, [v])), z = standardizeValues(values.score, cal);
  TOLS.forEach((tol, i) => { const r = rankCalibrated(z, tol); single[i].n++; if (r.first.includes(v)) { single[i].inFirst++; if (r.first.length === 1) single[i].alone++; } });
}
for (let i = 0; i < VALUE_CODES.length; i++) for (let j = i + 1; j < VALUE_CODES.length; j++) for (let k = 0; k < 60; k++) {
  const [a, b] = [VALUE_CODES[i], VALUE_CODES[j]], { values } = scoreAssessment(picks(caseRng, [a, b])), z = standardizeValues(values.score, cal);
  TOLS.forEach((tol, t) => { const r = rankCalibrated(z, tol); pair[t].n++; if (r.first.includes(a) && r.first.includes(b)) pair[t].bothFirst++; if (r.top3.includes(a) && r.top3.includes(b)) pair[t].bothTop3++; });
}

const pct = (x: number, n: number) => (x / n * 100).toFixed(1);
const rng1 = (r: Record<ValueCode, number>) => { const xs = VALUE_CODES.map((v) => r[v] / total * 100); return `${Math.min(...xs).toFixed(1)}~${Math.max(...xs).toFixed(1)}`; };
const calDiff = VALUE_CODES.map((v) => `${v} ${((cals[1].mean[v] - cals[0].mean[v]) / cals[0].sd[v]).toFixed(3)}/${((cals[2].mean[v] - cals[0].mean[v]) / cals[0].sd[v]).toFixed(3)}`);
const L = [
  "# B안 허용폭·보정 시드 비교",
  "",
  `엔진 ${SCORING_VERSION} · 보정 방식 ${VALUE_CALIBRATION_METHOD} · 배치 지문 ${valueLayoutFingerprint()} · 보정 표본 ${N_CAL}(시드 ${CAL_SEEDS.join(", ")}) · 평가 ${N_EVAL} × 시드 ${EVAL_SEEDS.join(", ")}. 검증용 집계.`,
  "허용폭은 잠정 근접 기준이며 검증된 동점 기준이 아니다. 목표 동점 비율에 맞춰 폭을 고르지 않는다.",
  "",
  "## 1. 무작위 평가 세트",
  "",
  "| 허용폭 | 1위 범위(몫 분할) | 상위 3 범위 | 1위 공동 | 상위 3 경계 공동 | 엔진과 같은 단독 1위 | 엔진 1위가 공동 1위로 | 다른 가치로 교체 |",
  "|---|---|---|---:|---:|---:|---:|---:|",
  ...rows.map((r) => `| ${r.tol} | ${rng1(r.t1)} | ${rng1(r.t3)} | ${pct(r.tie1, total)} | ${pct(r.tie3, total)} | ${pct(r.same, total)} | ${pct(r.soloToCo, total)} | ${pct(r.replaced, total)} |`),
  "",
  "## 2. 의도한 단일·복수 선호 (해당 가치가 나온 문항의 70%에서 선택)",
  "",
  "| 허용폭 | 한 가치: 1위(공동 포함) | 한 가치: 단독 1위 | 두 가치: 둘 다 1위 | 두 가치: 둘 다 상위 3 |",
  "|---|---:|---:|---:|---:|",
  ...TOLS.map((tol, i) => `| ${tol} | ${pct(single[i].inFirst, single[i].n)} | ${pct(single[i].alone, single[i].n)} | ${pct(pair[i].bothFirst, pair[i].n)} | ${pct(pair[i].bothTop3, pair[i].n)} |`),
  "",
  "## 3. 보정 시드 영향 (허용폭 0.05)",
  "",
  `- 보정 시드 ${CAL_SEEDS[0]} 대비 ${CAL_SEEDS[1]}·${CAL_SEEDS[2]}의 평균 차이(표준편차 단위): ${calDiff.join(" · ")}`,
  `- 보정 시드만 바꿨을 때 평가 응답의 공동 1위 집합이 달라지는 비율: ${pct(calFlip, total)}%`,
  "",
];
writeJson(vpath("analysis", "value-tolerance.json"), { scoringVersion: SCORING_VERSION, fingerprint: valueLayoutFingerprint(), cals, rows, total, single, pair, calFlip });
writeText(vpath("analysis", "value-tolerance.md"), L.join("\n"));
console.log(`B안 허용폭·보정 시드 비교 → ${vpath("analysis", "value-tolerance.md")}`);
