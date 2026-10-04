// 가치 쏠림 원인 분해: 같은 무작위 응답 세트에서 Selection만 / Diversity만 / 결합 점수로 1위·상위 3(동점 몫 분할)을 비교하고,
// 여러 시드로 반복해 상한 초과가 재현되는지 본다. 사용자 점수를 바꾸지 않는 검증용 집계다.
// 사용: node validation/run.mjs value-components [시드별 표본 수=10000] [시드 개수=5]
import { SCORING_VERSION, scoreAssessment } from "../../src/lib/scoring";
import { VALUE_CODES, type ValueCode } from "../../src/types/assessment";
import { generate, mulberry32 } from "./generators";
import { vpath, writeJson, writeText } from "./common";

const n = Number(process.argv[2] ?? 10000);
const seeds = Array.from({ length: Number(process.argv[3] ?? 5) }, (_, i) => 20261001 + i * 104729);
type Mode = "selection" | "diversity" | "score";
const MODES: readonly Mode[] = ["selection", "diversity", "score"];
const zero = () => Object.fromEntries(VALUE_CODES.map((v) => [v, 0])) as Record<ValueCode, number>;

function split(s: Record<ValueCode, number>, top1: Record<ValueCode, number>, top3: Record<ValueCode, number>) {
  const max = Math.max(...VALUE_CODES.map((v) => s[v]));
  const first = VALUE_CODES.filter((v) => s[v] === max);
  for (const v of first) top1[v] += 1 / first.length;
  const cut = [...VALUE_CODES].sort((a, b) => s[b] - s[a]).map((v) => s[v])[2];
  const above = VALUE_CODES.filter((v) => s[v] > cut), atCut = VALUE_CODES.filter((v) => s[v] === cut);
  for (const v of above) top3[v]++;
  for (const v of atCut) top3[v] += (3 - above.length) / atCut.length;
}

const results = seeds.map((seed) => {
  const rng = mulberry32(seed);
  const acc = Object.fromEntries(MODES.map((m) => [m, { top1: zero(), top3: zero() }])) as Record<Mode, { top1: Record<ValueCode, number>; top3: Record<ValueCode, number> }>;
  for (let k = 0; k < n; k++) {
    const { values } = scoreAssessment(generate("uniform", rng));
    for (const m of MODES) split(values[m], acc[m].top1, acc[m].top3);
  }
  return { seed, acc };
});

const pct = (x: number) => (x / n * 100).toFixed(1);
const lines = [
  "# 가치 쏠림 원인 분해",
  "",
  `엔진 ${SCORING_VERSION} · uniform ${n}세트 × 시드 ${seeds.length}개. 동점 몫 분할 기준. 사용자 점수를 바꾸지 않는 검증용 집계다.`,
  "기준: 1위 12.5% ±2%p, 상위 3 37.5% ±5%p.",
  "",
];
for (const m of MODES) {
  lines.push(`## ${m === "score" ? "결합 점수(0.6·Selection + 0.4·Diversity)" : m === "selection" ? "Selection만" : "Diversity만"}`, "");
  lines.push(`| 시드 | 구분 | ${VALUE_CODES.join(" | ")} |`, `|---|---|${VALUE_CODES.map(() => "---:").join("|")}|`);
  for (const r of results) {
    lines.push(`| ${r.seed} | 1위 | ${VALUE_CODES.map((v) => pct(r.acc[m].top1[v])).join(" | ")} |`);
    lines.push(`| ${r.seed} | 상위 3 | ${VALUE_CODES.map((v) => pct(r.acc[m].top3[v])).join(" | ")} |`);
  }
  lines.push("");
}
writeJson(vpath("analysis", "value-components.json"), { scoringVersion: SCORING_VERSION, n, seeds, results });
writeText(vpath("analysis", "value-components.md"), lines.join("\n"));
console.log(`가치 쏠림 원인 분해 → ${vpath("analysis", "value-components.md")}`);
