// Step 2: 페르소나 없이 엔진 자체의 구조적 쏠림을 본다.
// 사용: node validation/run.mjs montecarlo [uniform 표본 수=10000] [스타일별 표본 수=2000]
import { SCORING_VERSION, scoreAssessment } from "../../src/lib/scoring";
import { CORE } from "../../src/data/content";
import { CORE_TYPES, VALUE_CODES } from "../../src/types/assessment";
import { STYLES, generate, mulberry32, type Style } from "./generators";
import { pct, summarize, topEntries, type Summary } from "./summary";
import { vpath, writeJson, writeText } from "./common";

const SEED = 20261001;
const nUniform = Number(process.argv[2] ?? 10000);
const nStyle = Number(process.argv[3] ?? 2000);

const summaries = {} as Record<Style, Summary>;
for (const [i, style] of (Object.keys(STYLES) as Style[]).entries()) {
  const rng = mulberry32(SEED + i * 7919);
  const n = style === "uniform" ? nUniform : nStyle;
  const rows = Array.from({ length: n }, () => scoreAssessment(generate(style, rng)));
  summaries[style] = summarize(rows);
}

writeJson(vpath("analysis", "montecarlo.json"), { scoringVersion: SCORING_VERSION, seed: SEED, styles: STYLES, summaries });

const name = (t: string) => (t in CORE ? CORE[t as keyof typeof CORE].name : t);
const u = summaries.uniform;
const fmtDist = (d: Record<string, number>, label = (k: string) => k) => Object.entries(d).map(([k, v]) => `${label(k)} ${pct(v)}`).join(" · ");
const lines = [
  "# Step 2 · 몬테카를로 기준선",
  "",
  `엔진 ${SCORING_VERSION} · 시드 ${SEED} · uniform ${nUniform}세트, 그 밖의 스타일 ${nStyle}세트씩. 생성 규칙은 ASSUMPTIONS.md V4와 \`scripts/generators.ts\`.`,
  "무작위 응답은 실제 사람의 분포가 아니다. 여기서 보는 것은 \"응답이 아무 정보도 없을 때 엔진이 어디로 기우는가\"이다.",
  "",
  "## 1. 무작위(uniform) 응답의 분포",
  "",
  `- Primary Core: ${fmtDist(u.core.primary, name)} (균등도 ${u.core.primaryEvenness.toFixed(3)}, 이상값 1/9 = 11.1%)`,
  `- 판정 유보 ${pct(u.core.undetermined)} · 강한 보조 Core ${pct(u.core.strongSecondary)} · 동기 진술 약함 ${pct(u.core.weakMotive)} · Influence 없음 ${pct(u.core.noInfluence)}`,
  `- CoreConfidence: 중앙값 ${u.core.confidence.p50.toFixed(1)} (p10 ${u.core.confidence.p10.toFixed(1)} – p90 ${u.core.confidence.p90.toFixed(1)}) · 구간 ${fmtDist(u.core.confidenceBand)}`,
  `- Value Top1: ${fmtDist(u.values.top1)} (균등도 ${u.values.top1Evenness.toFixed(3)}, 이상값 1/8 = 12.5%)`,
  `- Value Top3 포함률: ${fmtDist(u.values.inTop3)} (이상값 3/8 = 37.5%)`,
  `- Schema Top1: ${fmtDist(u.schemas.top1)} (균등도 ${u.schemas.top1Evenness.toFixed(3)})`,
  `- STATE: ${fmtDist(u.state)}`,
  `- 취약 트리거 수: ${fmtDist(u.stress.vulnerableCount)}`,
  `- 메시지 1위 = Primary ${pct(u.message.matchesPrimary)} · 메시지 1위 분포 ${fmtDist(u.message.rank1, name)}`,
  `- 강화 1개 이상 ${pct(u.insights.anyReinforcement)} · 반증 ${pct(u.insights.counterevidence)} · 응답 일관성 플래그 ${pct(u.consistencyFlag)}`,
  "",
  "### Primary Core별 강화·반증 발생률 (uniform)",
  "",
  "| Core | n | Primary 강화 | 반증 |",
  "|---|---:|---:|---:|",
  ...CORE_TYPES.map((t) => `| ${name(t)} | ${u.insights.reinforcementByPrimary[t].n} | ${pct(u.insights.reinforcementByPrimary[t].rate)} | ${pct(u.insights.counterevidenceByPrimary[t].rate)} |`),
  "",
  "## 2. 응답 스타일별 비교",
  "",
  "| 스타일 | Primary 최다 | 판정 유보 | Confidence 중앙값 | Value Top1 최다 | Schema Top1 최다 | STATE 보호 | 강화 | 반증 | 일관성 플래그 |",
  "|---|---|---:|---:|---|---|---:|---:|---:|---:|",
  ...(Object.keys(STYLES) as Style[]).map((s) => {
    const x = summaries[s];
    const top = (d: Record<string, number>, f = (k: string) => k) => topEntries(d, 2).map(([k, v]) => `${f(k)} ${pct(v, 0)}`).join(", ");
    return `| ${s} | ${top(x.core.primary, name)} | ${pct(x.core.undetermined)} | ${x.core.confidence.p50.toFixed(1)} | ${top(x.values.top1)} | ${top(x.schemas.top1)} | ${pct(x.state.protection)} | ${pct(x.insights.anyReinforcement)} | ${pct(x.insights.counterevidence)} | ${pct(x.consistencyFlag)} |`;
  }),
  "",
  "스타일 설명: " + Object.entries(STYLES).map(([k, v]) => `\`${k}\` ${v}`).join(" / "),
  "",
  `Value 코드: ${VALUE_CODES.join(", ")}`,
];
writeText(vpath("analysis", "montecarlo.md"), `${lines.join("\n")}\n`);
console.log(lines.slice(6, 20).join("\n"));
