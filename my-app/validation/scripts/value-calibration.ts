// 가치 채점 보정 후보 비교(검증용). 사용자 점수를 바꾸지 않는다.
// 보정용 무작위 세트로 가치별 평균·표준편차·분포를 고정한 뒤, 별도 평가 세트에서 후보를 비교한다.
//   engine: 현재 엔진(결합 점수 → 정의 순서) · engineTie: 현재 결합 점수, 동점은 나눔
// 보정 점수 차이가 보정 표본의 잡음 수준 이하이면 동점으로 본다(A·B: z 0.05, C: 백분위 0.01).
//   A: Selection 표준화 (sel − μ) / σ
//   B: 결합 점수 표준화 (score − μ) / σ   (결합 비중 0.6/0.4 유지)
//   C: 결합 점수의 무작위 분포 내 위치(중간 순위 백분위)
// 사용: node validation/run.mjs value-calibration [보정 표본=20000] [평가 표본=10000] [평가 시드 수=3]
import { PART1 } from "../../src/data/items";
import { SCORING_VERSION, scoreAssessment } from "../../src/lib/scoring";
import { VALUE_CODES, type Answers, type ChoiceAnswer, type OptionKey, type ValueCode } from "../../src/types/assessment";
import { generate, mulberry32, shuffle, type Rng } from "./generators";
import { vpath, writeJson, writeText } from "./common";

const N_CAL = Number(process.argv[2] ?? 20000);
const N_EVAL = Number(process.argv[3] ?? 10000);
const EVAL_SEEDS = Array.from({ length: Number(process.argv[4] ?? 3) }, (_, i) => 31000 + i * 7919);
const CAL_SEED = 777001;
const EPS = 1e-9;
type Vals = Record<ValueCode, number>;
type Cand = "engine" | "engineTie" | "A" | "B" | "C";
const CANDS: readonly Cand[] = ["engine", "engineTie", "A", "B", "C"];
const TOL: Record<Cand, number> = { engine: 1e-9, engineTie: 1e-9, A: 0.05, B: 0.05, C: 0.01 };
const zero = () => Object.fromEntries(VALUE_CODES.map((v) => [v, 0])) as Vals;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// ── 1. 보정 세트 ────────────────────────────────────────────────
const calSel = Object.fromEntries(VALUE_CODES.map((v) => [v, [] as number[]])) as Record<ValueCode, number[]>;
const calScore = Object.fromEntries(VALUE_CODES.map((v) => [v, [] as number[]])) as Record<ValueCode, number[]>;
{
  const rng = mulberry32(CAL_SEED);
  for (let k = 0; k < N_CAL; k++) {
    const { values } = scoreAssessment(generate("uniform", rng));
    for (const v of VALUE_CODES) { calSel[v].push(values.selection[v]); calScore[v].push(values.score[v]); }
  }
}
function stats(xs: number[]) {
  const m = mean(xs), sd = Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  const skew = mean(xs.map((x) => ((x - m) / sd) ** 3));
  const s = [...xs].sort((a, b) => a - b), q = (p: number) => s[Math.floor(p * (s.length - 1))];
  return { mean: m, sd, skew, p10: q(0.1), p50: q(0.5), p90: q(0.9), distinct: new Set(xs.map((x) => x.toFixed(6))).size };
}
const selStats = Object.fromEntries(VALUE_CODES.map((v) => [v, stats(calSel[v])])) as Record<ValueCode, ReturnType<typeof stats>>;
const scoreStats = Object.fromEntries(VALUE_CODES.map((v) => [v, stats(calScore[v])])) as Record<ValueCode, ReturnType<typeof stats>>;
const sortedScore = Object.fromEntries(VALUE_CODES.map((v) => [v, [...calScore[v]].sort((a, b) => a - b)])) as Record<ValueCode, number[]>;
function lowerBound(xs: number[], x: number, strict: boolean) {
  let lo = 0, hi = xs.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (strict ? xs[mid] < x - EPS : xs[mid] <= x + EPS) lo = mid + 1; else hi = mid; }
  return lo;
}
const midRank = (v: ValueCode, x: number) => { const s = sortedScore[v], below = lowerBound(s, x, true), upto = lowerBound(s, x, false); return (below + (upto - below) / 2) / s.length; };

// ── 2. 후보 점수 ────────────────────────────────────────────────
type Scored = ReturnType<typeof scoreAssessment>["values"];
function candScores(c: Cand, val: Scored): Vals {
  const out = zero();
  for (const v of VALUE_CODES) {
    out[v] = c === "A" ? (val.selection[v] - selStats[v].mean) / selStats[v].sd
      : c === "B" ? (val.score[v] - scoreStats[v].mean) / scoreStats[v].sd
        : c === "C" ? midRank(v, val.score[v])
          : val.score[v];
  }
  return out;
}
/** 1위 집합과 상위 3 몫(동점 분할). engine은 엔진의 정의 순서 처리를 그대로 쓴다. */
function tops(c: Cand, val: Scored) {
  const s = candScores(c, val);
  if (c === "engine") {
    const t1 = zero(), t3 = zero();
    // 보정 전 기준선: 결합 점수 → 정의 순서(v1.2-app.1까지의 엔진 순위)
    const rawRank = [...VALUE_CODES].sort((a, b) => val.score[b] - val.score[a]);
    t1[rawRank[0]] = 1; for (const v of rawRank.slice(0, 3)) t3[v] = 1;
    return { s, first: [rawRank[0]] as ValueCode[], t1, t3, tie1: false, tie3: false, top3set: rawRank.slice(0, 3) };
  }
  const tol = TOL[c];
  const max = Math.max(...VALUE_CODES.map((v) => s[v]));
  const first = VALUE_CODES.filter((v) => max - s[v] < tol);
  const sorted = [...VALUE_CODES].sort((a, b) => s[b] - s[a]), cut = s[sorted[2]];
  const above = VALUE_CODES.filter((v) => s[v] - cut >= tol), atCut = VALUE_CODES.filter((v) => Math.abs(s[v] - cut) < tol);
  const t1 = zero(), t3 = zero();
  for (const v of first) t1[v] = 1 / first.length;
  for (const v of above) t3[v] = 1;
  for (const v of atCut) t3[v] = (3 - above.length) / atCut.length;
  return { s, first, t1, t3, tie1: first.length > 1, tie3: atCut.length > 3 - above.length, top3set: [...above, ...atCut] };
}

// ── 3. 응답 생성 ────────────────────────────────────────────────
const keyOf = (item: (typeof PART1)[number], v: ValueCode) => item.options.find((o) => o.value === v)?.key;
function withPart1(rng: Rng, choose: (item: (typeof PART1)[number]) => ChoiceAnswer): Answers {
  const a = generate("uniform", rng) as Record<string, unknown>;
  for (const item of PART1) a[item.id] = choose(item);
  return a as Answers;
}
const randomPair = (rng: Rng, keys: OptionKey[]): ChoiceAnswer => { const [first, second] = shuffle(rng, keys); return { first, second }; };
/** 목표 가치가 있는 문항의 70%에서 그 보기를 고른다(1·2순위 반반). 나머지는 무작위. */
const PICK = 0.7;
function consistent(rng: Rng, target: ValueCode): Answers {
  return withPart1(rng, (item) => {
    const k = keyOf(item, target), keys = item.options.map((o) => o.key);
    if (!k || rng() >= PICK) { const others = keys.filter((x) => x !== k); const [f, sec] = shuffle(rng, others); return { first: f, second: sec }; }
    const other = shuffle(rng, keys.filter((x) => x !== k))[0];
    return rng() < 0.5 ? { first: k, second: other } : { first: other, second: k };
  });
}
function mixed(rng: Rng, a: ValueCode, b: ValueCode): Answers {
  return withPart1(rng, (item) => {
    const ka = keyOf(item, a), kb = keyOf(item, b), keys = item.options.map((o) => o.key);
    const pa = ka && rng() < PICK ? ka : undefined, pb = kb && rng() < PICK ? kb : undefined;
    const chosen = [pa, pb].filter((x): x is OptionKey => !!x);
    const rest = shuffle(rng, keys.filter((x) => !chosen.includes(x)));
    const [f, sec] = shuffle(rng, [...chosen, ...rest].slice(0, 2));
    return { first: f, second: sec };
  });
}
function perturb(rng: Rng, answers: Answers): Answers {
  const a = { ...(answers as Record<string, unknown>) };
  const item = PART1[Math.floor(rng() * PART1.length)], cur = a[item.id] as ChoiceAnswer;
  let next = cur;
  while (next.first === cur.first && next.second === cur.second) next = randomPair(rng, item.options.map((o) => o.key));
  a[item.id] = next;
  return a as Answers;
}

// ── 4. 평가 ─────────────────────────────────────────────────────
const sameSet = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((v) => y.includes(v));
const evals = EVAL_SEEDS.map((seed) => {
  const rng = mulberry32(seed);
  const acc = Object.fromEntries(CANDS.map((c) => [c, { t1: zero(), t3: zero(), tie1: 0, tie3: 0, flip1: 0, flip3: 0, diffEngine1: 0 }])) as Record<Cand, { t1: Vals; t3: Vals; tie1: number; tie3: number; flip1: number; flip3: number; diffEngine1: number }>;
  const examples: Record<string, string[]> = { engineTie: [], A: [], B: [], C: [] };
  for (let k = 0; k < N_EVAL; k++) {
    const ans = generate("uniform", rng), val = scoreAssessment(ans).values, val2 = scoreAssessment(perturb(rng, ans)).values;
    const eng = tops("engine", val);
    for (const c of CANDS) {
      const r = tops(c, val), r2 = tops(c, val2), x = acc[c];
      for (const v of VALUE_CODES) { x.t1[v] += r.t1[v]; x.t3[v] += r.t3[v]; }
      if (r.tie1) x.tie1++; if (r.tie3) x.tie3++;
      if (!sameSet(r.first, r2.first)) x.flip1++;
      if (!sameSet(r.top3set, r2.top3set)) x.flip3++;
      if (!sameSet(r.first, eng.first)) {
        x.diffEngine1++;
        if (c !== "engine" && examples[c].length < 4) {
          const desc = (v: ValueCode) => `${v}(sel ${val.selection[v].toFixed(0)}·div ${val.diversity[v].toFixed(0)}·득점 ${val.capped[v]})`;
          examples[c].push(`엔진 1위 ${eng.first.map(desc).join(", ")} → ${c} 1위 ${r.first.map(desc).join(", ")}`);
        }
      }
    }
  }
  return { seed, acc, examples };
});

// 한 가치 일관 선택 / 두 가치 혼합 선택
const caseRng = mulberry32(424242);
const consistentRes = Object.fromEntries(CANDS.map((c) => [c, zero()])) as Record<Cand, Vals>;
const consistent3 = Object.fromEntries(CANDS.map((c) => [c, zero()])) as Record<Cand, Vals>;
const N_CASE = 500;
for (const v of VALUE_CODES) for (let k = 0; k < N_CASE; k++) {
  const val = scoreAssessment(consistent(caseRng, v)).values;
  for (const c of CANDS) { const r = tops(c, val); consistentRes[c][v] += r.t1[v]; consistent3[c][v] += r.t3[v]; }
}
const mixedRes = Object.fromEntries(CANDS.map((c) => [c, { both3: 0, both2: 0, gapSd: 0, n: 0 }])) as Record<Cand, { both3: number; both2: number; gapSd: number; n: number }>;
for (let i = 0; i < VALUE_CODES.length; i++) for (let j = i + 1; j < VALUE_CODES.length; j++) for (let k = 0; k < 100; k++) {
  const [a, b] = [VALUE_CODES[i], VALUE_CODES[j]], val = scoreAssessment(mixed(caseRng, a, b)).values;
  for (const c of CANDS) {
    const r = tops(c, val), m = mixedRes[c];
    m.n++; m.both3 += Math.min(r.t3[a], 1) * Math.min(r.t3[b], 1);
    const sorted = [...VALUE_CODES].sort((x, y) => r.s[y] - r.s[x]);
    if (sorted.slice(0, 2).includes(a) && sorted.slice(0, 2).includes(b)) m.both2++;
    const spread = Math.sqrt(mean(VALUE_CODES.map((v) => (r.s[v] - mean(VALUE_CODES.map((u) => r.s[u]))) ** 2)));
    m.gapSd += Math.abs(r.s[a] - r.s[b]) / (spread || 1);
  }
}

// ── 5. 보고 ─────────────────────────────────────────────────────
const p = (x: number, n: number) => `${(x / n * 100).toFixed(1)}`;
const L: string[] = [
  "# 가치 채점 보정 후보 비교",
  "",
  `엔진 ${SCORING_VERSION} · 보정 세트 uniform ${N_CAL}(시드 ${CAL_SEED}) · 평가 세트 uniform ${N_EVAL} × 시드 ${EVAL_SEEDS.join(", ")}. 검증용 집계이며 사용자 점수를 바꾸지 않는다.`,
  "후보: engine 현재(결합 점수→정의 순서) · A Selection 표준화 · B 결합 점수 표준화(0.6/0.4 유지) · C 결합 점수의 무작위 분포 내 위치.",
  "",
  "## 1. 보정 세트의 가치별 분포",
  "",
  `| 가치 | Sel 평균 | Sel SD | Sel 왜도 | Sel p10/p50/p90 | Sel 값 개수 | 결합 평균 | 결합 SD | 결합 왜도 |`,
  "|---|---:|---:|---:|---|---:|---:|---:|---:|",
  ...VALUE_CODES.map((v) => { const s = selStats[v], c = scoreStats[v]; return `| ${v} | ${s.mean.toFixed(1)} | ${s.sd.toFixed(1)} | ${s.skew.toFixed(2)} | ${s.p10.toFixed(0)}/${s.p50.toFixed(0)}/${s.p90.toFixed(0)} | ${s.distinct} | ${c.mean.toFixed(1)} | ${c.sd.toFixed(1)} | ${c.skew.toFixed(2)} |`; }),
  "",
  "## 2. 평가 세트: 1위·상위 3 (동점 몫 분할, %)",
  "",
];
for (const c of CANDS) {
  L.push(`### ${c}`, "", `| 시드 | 구분 | ${VALUE_CODES.join(" | ")} | 범위 |`, `|---|---|${VALUE_CODES.map(() => "---:").join("|")}|---|`);
  for (const e of evals) {
    const x = e.acc[c], r1 = VALUE_CODES.map((v) => x.t1[v] / N_EVAL * 100), r3 = VALUE_CODES.map((v) => x.t3[v] / N_EVAL * 100);
    L.push(`| ${e.seed} | 1위 | ${r1.map((y) => y.toFixed(1)).join(" | ")} | ${Math.min(...r1).toFixed(1)}~${Math.max(...r1).toFixed(1)} |`);
    L.push(`| ${e.seed} | 상위 3 | ${r3.map((y) => y.toFixed(1)).join(" | ")} | ${Math.min(...r3).toFixed(1)}~${Math.max(...r3).toFixed(1)} |`);
  }
  L.push("");
}
L.push("## 3. 동점·안정성·현재 방식과의 차이 (평가 세트 평균, %)", "",
  "| 후보 | 1위 동점 | 상위 3 경계 동점 | 응답 1개 변경 시 1위 바뀜 | 상위 3 집합 바뀜 | 엔진과 1위 다름 |", "|---|---:|---:|---:|---:|---:|");
for (const c of CANDS) {
  const s = (f: (x: (typeof evals)[number]["acc"][Cand]) => number) => p(evals.reduce((a, e) => a + f(e.acc[c]), 0), N_EVAL * evals.length);
  L.push(`| ${c} | ${s((x) => x.tie1)} | ${s((x) => x.tie3)} | ${s((x) => x.flip1)} | ${s((x) => x.flip3)} | ${s((x) => x.diffEngine1)} |`);
}
L.push("", "## 4. 한 가치를 꾸준히 고른 응답 (가치마다 500건, 그 가치가 나온 문항의 70%에서 선택; 그 가치가 1위 / 상위 3인 비율 %)", "",
  `| 후보 | ${VALUE_CODES.map((v) => `${v} 1위/상위3`).join(" | ")} |`, `|---|${VALUE_CODES.map(() => "---").join("|")}|`);
for (const c of CANDS) L.push(`| ${c} | ${VALUE_CODES.map((v) => `${p(consistentRes[c][v], N_CASE)}/${p(consistent3[c][v], N_CASE)}`).join(" | ")} |`);
L.push("", "## 5. 두 가치를 비슷하게 고른 응답 (28쌍 × 100건, 각 가치가 나온 문항의 70%에서 선택)", "",
  "| 후보 | 두 가치 모두 상위 3 | 두 가치가 1·2위 | 두 가치 점수 차 / 전체 점수 퍼짐(평균) |", "|---|---:|---:|---:|");
for (const c of CANDS) { const m = mixedRes[c]; L.push(`| ${c} | ${p(m.both3, m.n)} | ${p(m.both2, m.n)} | ${(m.gapSd / m.n).toFixed(2)} |`); }
L.push("", "## 6. 엔진과 1위가 달라진 사례 (첫 평가 시드, 후보별 최대 4건)", "", "표기: 가치(Selection·Diversity·제한 득점)", "");
for (const c of ["A", "B", "C"] as const) { L.push(`- **${c}**`); for (const ex of evals[0].examples[c]) L.push(`  - ${ex}`); }
writeJson(vpath("analysis", "value-calibration.json"), { scoringVersion: SCORING_VERSION, N_CAL, N_EVAL, CAL_SEED, EVAL_SEEDS, selStats, scoreStats, evals, consistentRes, consistent3, mixedRes });
writeText(vpath("analysis", "value-calibration.md"), L.join("\n") + "\n");
console.log(`가치 채점 보정 후보 비교 → ${vpath("analysis", "value-calibration.md")}`);
