// 같은 페르소나(truth)에 대해 V1.0(archive/round2-v1.0/results, 3지선다)과 현재 결과(results, V1.1-app 4지선다)의 run1 정확도를 비교한다.
// 각 버전의 결과는 그 버전 엔진으로 채점된 파일을 그대로 읽는다(재채점하지 않음).
import { existsSync, readdirSync } from "node:fs";
import { CORE } from "../../src/data/content";
import { CORE_TYPES, type AssessmentResult, type CoreType } from "../../src/types/assessment";
import { readJson, vpath, writeJson, writeText } from "./common";
import { pct } from "./summary";

interface Truth { id: string; response_style: string; core: { primary: CoreType; secondary: CoreType }; attachment: { ANX: string; AVO: string }; schema_top3: string[]; values_top3: string[]; state_band: string; case?: { primary: string | null } }
const band3 = (x: number) => (x < 40 ? "low" : x < 60 ? "mid" : "high");
const overlap = (a: readonly string[], b: readonly string[]) => a.filter((x) => b.includes(x)).length;
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
const name = (t: string) => (t in CORE ? CORE[t as CoreType].name : t);

const ids = readdirSync(vpath("truth")).filter((f) => /^p\d{2}_truth\.json$/.test(f)).map((f) => f.slice(0, 3)).sort();
const truth = new Map(ids.map((id) => [id, readJson<Truth>(vpath("truth", `${id}_truth.json`))]));
const VERSIONS = { "V1.0 (3지선다)": vpath("archive", "round2-v1.0", "results"), "V1.1-app (4지선다)": vpath("results") } as const;

const rows = Object.entries(VERSIONS).map(([label, dir]) => {
  const recs = ids.filter((id) => existsSync(`${dir}/${id}_run1.json`)).map((id) => ({ id, t: truth.get(id)!, r: readJson<AssessmentResult>(`${dir}/${id}_run1.json`) }));
  const normal = recs.filter((x) => x.t.response_style === "normal");
  const counter = normal.filter((x) => x.t.case?.primary === "Counterevidence");
  const primaryDist = Object.fromEntries(CORE_TYPES.map((c) => [c, recs.filter((x) => x.r.core.primary === c).length]));
  return {
    label, n: recs.length, normalN: normal.length,
    coreTop1: mean(normal.map((x) => (x.r.core.primary === x.t.core.primary ? 1 : 0))),
    coreTop2: mean(normal.map((x) => (x.r.core.ranking.slice(0, 2).includes(x.t.core.primary) ? 1 : 0))),
    secondaryTop3: mean(normal.map((x) => (x.r.core.ranking.slice(0, 3).includes(x.t.core.secondary) ? 1 : 0))),
    counterTop1: mean(counter.map((x) => (x.r.core.primary === x.t.core.primary ? 1 : 0))), counterN: counter.length,
    undetermined: mean(recs.map((x) => (x.r.core.status === "undetermined" ? 1 : 0))),
    confidenceMedian: [...recs.map((x) => x.r.core.confidence)].sort((a, b) => a - b)[Math.floor(recs.length / 2)],
    separationMean: mean(recs.map((x) => x.r.core.separation)),
    valueTop3: mean(normal.map((x) => overlap(x.r.values.top3, x.t.values_top3) / 3)),
    valueTop1: mean(normal.map((x) => (x.r.values.top3[0] === x.t.values_top3[0] ? 1 : 0))),
    schemaTop3: mean(normal.map((x) => overlap(x.r.schemaRanking.slice(0, 3), x.t.schema_top3) / 3)),
    anx: mean(normal.map((x) => (band3(x.r.attachment.ANX) === x.t.attachment.ANX ? 1 : 0))),
    avo: mean(normal.map((x) => (band3(x.r.attachment.AVO) === x.t.attachment.AVO ? 1 : 0))),
    state: mean(normal.map((x) => (x.r.state.band === x.t.state_band ? 1 : 0))),
    primaryDist,
    misses: normal.filter((x) => x.r.core.primary !== x.t.core.primary).map((x) => `${x.id} ${name(x.t.core.primary)}→${name(x.r.core.primary)}`),
  };
});
writeJson(vpath("analysis", "v1.1-comparison.json"), rows);

const [a, b] = rows;
const line = (label: string, f: (r: (typeof rows)[number]) => string) => `| ${label} | ${f(a)} | ${f(b)} |`;
const md = [
  "# V1.0 ↔ V1.1-app 비교 (같은 페르소나 30명, run1)",
  "",
  "- V1.0: Part 1 3지선다, 엔진 `v1.0-app.1` (2차 라운드 결과 보관본)",
  "- V1.1-app: Part 1 4지선다, 엔진 `v1.1-app.1`, M5·P2 등 문구 변경 반영 문항지로 새로 응답",
  "- 같은 bio를 쓰지만 응답은 독립 실행이다. V1.0의 run1↔run2 Primary 일치가 83%였으므로, 30명 규모에서 몇 명 차이는 응답 변동일 수 있다(스모크 테스트).",
  "",
  "| 지표 (일반 응답 27명 기준) | V1.0 | V1.1-app |", "|---|---:|---:|",
  line("Core Top1 적중", (r) => pct(r.coreTop1)),
  line("Core Top2 안", (r) => pct(r.coreTop2)),
  line("의도 보조 Core가 Top3 안", (r) => pct(r.secondaryTop3)),
  line("반증형 페르소나 Core Top1", (r) => `${pct(r.counterTop1)} (n=${r.counterN})`),
  line("판정 유보 (30명)", (r) => pct(r.undetermined)),
  line("CoreConfidence 중앙값 (30명)", (r) => r.confidenceMedian.toFixed(1)),
  line("Core 분리도 평균 (30명)", (r) => r.separationMean.toFixed(1)),
  line("Value Top3 겹침", (r) => pct(r.valueTop3)),
  line("Value Top1 일치", (r) => pct(r.valueTop1)),
  line("Schema Top3 겹침", (r) => pct(r.schemaTop3)),
  line("ANX 구간 / AVO 구간", (r) => `${pct(r.anx)} / ${pct(r.avo)}`),
  line("STATE 밴드", (r) => pct(r.state)),
  "",
  "## 결과 Primary 분포 (30명, 의도는 Core마다 3명 + 엣지 3명)",
  "",
  `| 버전 | ${CORE_TYPES.map(name).join(" | ")} |`, `|---|${CORE_TYPES.map(() => "---:").join("|")}|`,
  ...rows.map((r) => `| ${r.label} | ${CORE_TYPES.map((c) => r.primaryDist[c]).join(" | ")} |`),
  "",
  "## Core를 놓친 페르소나 (일반 응답)",
  "",
  ...rows.map((r) => `- ${r.label}: ${r.misses.join(", ") || "없음"}`),
];
writeText(vpath("analysis", "v1.1-comparison.md"), `${md.join("\n")}\n`);
console.log(md.join("\n"));
