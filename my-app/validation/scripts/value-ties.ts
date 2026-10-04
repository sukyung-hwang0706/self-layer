// 가치 순위의 동점 영향: 같은 무작위 응답 세트에서 (1) 현재 엔진의 정의 순서 처리, (2) 동점 몫을 나눈 선정 비율,
// (3) 동점을 모두 표시할 때의 실제 표시 비율과 동점 발생률을 함께 본다. 동점 몫 분할은 검증용 집계이며 사용자 점수를 바꾸지 않는다.
// 사용: node validation/run.mjs value-ties [표본 수=10000]
import { SCORING_VERSION, scoreAssessment } from "../../src/lib/scoring";
import { VALUE_CODES, type ValueCode } from "../../src/types/assessment";
import { generate, mulberry32 } from "./generators";
import { vpath, writeJson, writeText } from "./common";

const SEED = 20261001; // montecarlo.ts uniform과 같은 시드
const n = Number(process.argv[2] ?? 10000);
const rng = mulberry32(SEED);

const zero = () => Object.fromEntries(VALUE_CODES.map((v) => [v, 0])) as Record<ValueCode, number>;
const engineTop1 = zero(), engineTop3 = zero(), splitTop1 = zero(), splitTop3 = zero(), shownTop1 = zero(), shownTop3 = zero();
let tie1 = 0, tie3 = 0;

for (let k = 0; k < n; k++) {
  const { values } = scoreAssessment(generate("uniform", rng));
  const s = values.score;
  // 보정 전 기준선: 결합 점수 → 정의 순서(V1.2-app.1까지의 엔진 순위)
  const rawRank = [...VALUE_CODES].sort((a, b) => s[b] - s[a]);
  engineTop1[rawRank[0]]++;
  for (const v of rawRank.slice(0, 3)) engineTop3[v]++;

  // 1위: 최고점과 같은 가치 모두
  const max = Math.max(...VALUE_CODES.map((v) => s[v]));
  const first = VALUE_CODES.filter((v) => s[v] === max);
  if (first.length > 1) tie1++;
  for (const v of first) { splitTop1[v] += 1 / first.length; shownTop1[v]++; }

  // 상위 3: 3위 점수보다 높은 가치는 확정, 3위 점수와 같은 가치들은 남은 자리를 나눠 갖는다
  const sorted = [...VALUE_CODES].sort((a, b) => s[b] - s[a]);
  const cut = s[sorted[2]];
  const above = VALUE_CODES.filter((v) => s[v] > cut), atCut = VALUE_CODES.filter((v) => s[v] === cut);
  const seats = 3 - above.length;
  if (atCut.length > seats) tie3++;
  for (const v of above) { splitTop3[v]++; shownTop3[v]++; }
  for (const v of atCut) { splitTop3[v] += seats / atCut.length; shownTop3[v]++; }
}

const pct = (x: number) => `${(x / n * 100).toFixed(1)}%`;
const row = (label: string, r: Record<ValueCode, number>) => `| ${label} | ${VALUE_CODES.map((v) => pct(r[v])).join(" | ")} | ${pct(VALUE_CODES.reduce((a, v) => a + r[v], 0))} |`;
writeJson(vpath("analysis", "value-ties.json"), { scoringVersion: SCORING_VERSION, seed: SEED, n, engineTop1, splitTop1, shownTop1, engineTop3, splitTop3, shownTop3, tie1, tie3 });
writeText(vpath("analysis", "value-ties.md"), [
  "# 가치 순위의 동점 영향",
  "",
  `엔진 ${SCORING_VERSION} · 시드 ${SEED} · uniform ${n}세트. 동점 몫 분할은 검증용 집계이며 사용자 점수를 바꾸지 않는다.`,
  "",
  `- 1위 동점 발생률 ${pct(tie1)} · 상위 3 경계 동점 발생률 ${pct(tie3)}`,
  "- 엔진(보정 전): 결합 점수 → 정의 순서로 자른 결과(v1.2-app.1까지의 순위)",
  "- 몫 분할: 동점이면 자리를 나눠 센다. 대칭 기준(1위 12.5%, 상위 3 37.5%)과 비교한다",
  "- 표시: 동점을 모두 표시할 때 화면에 나오는 비율. 합계가 100%·300%를 넘을 수 있다",
  "",
  `| 구분 | ${VALUE_CODES.join(" | ")} | 합계 |`,
  `|---|${VALUE_CODES.map(() => "---:").join("|")}|---:|`,
  row("1위 · 엔진", engineTop1), row("1위 · 몫 분할", splitTop1), row("1위 · 표시", shownTop1),
  row("상위 3 · 엔진", engineTop3), row("상위 3 · 몫 분할", splitTop3), row("상위 3 · 표시", shownTop3),
  "",
].join("\n"));
console.log(`가치 동점 분석 ${n}세트 → ${vpath("analysis", "value-ties.md")}`);
