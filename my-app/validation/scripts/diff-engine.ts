// Step 1: 앱 엔진(scoreAssessment)과 설계서 독립 구현(referenceScore)을 필드 단위로 비교한다.
// 독립 구현에 있는 필드만 비교한다(없는 필드 = 설계서에 식이 없어 구현하지 않은 것).
import { SCORING_VERSION, scoreAssessment } from "../../src/lib/scoring";
import { referenceScore } from "./reference-scorer";
import { STYLES, generate, mulberry32, type Style } from "./generators";
import { vpath, writeJson, writeText } from "./common";

const SEED = 777;
const PER_STYLE: Record<Style, number> = { uniform: 1000, all3: 50, extreme: 300, acquiescent: 300, desirable: 300, firstA: 100, firstB: 100, firstC: 100, firstD: 100 };
const EPS = 1e-9;

type Mismatch = { count: number; examples: { style: Style; app: unknown; ref: unknown }[] };
const mismatches = new Map<string, Mismatch>();
const compared = new Map<string, number>();

function walk(path: string, ref: unknown, app: unknown, style: Style) {
  if (ref !== null && typeof ref === "object" && !Array.isArray(ref)) {
    for (const k of Object.keys(ref as object)) walk(path ? `${path}.${k}` : k, (ref as Record<string, unknown>)[k], (app as Record<string, unknown> | undefined)?.[k], style);
    return;
  }
  compared.set(path, (compared.get(path) ?? 0) + 1);
  const same = typeof ref === "number" && typeof app === "number" ? Math.abs(ref - app) <= EPS : JSON.stringify(ref) === JSON.stringify(app);
  if (same) return;
  const m = mismatches.get(path) ?? { count: 0, examples: [] };
  m.count += 1;
  if (m.examples.length < 3) m.examples.push({ style, app, ref });
  mismatches.set(path, m);
}

let total = 0;
for (const [i, style] of (Object.keys(STYLES) as Style[]).entries()) {
  const rng = mulberry32(SEED + i);
  for (let n = 0; n < PER_STYLE[style]; n++) {
    const answers = generate(style, rng);
    walk("", referenceScore(answers), scoreAssessment(answers), style);
    total += 1;
  }
}

const rows = [...compared.entries()].map(([path, n]) => ({ path, compared: n, mismatched: mismatches.get(path)?.count ?? 0, examples: mismatches.get(path)?.examples ?? [] }));
writeJson(vpath("analysis", "engine-diff.json"), { scoringVersion: SCORING_VERSION, seed: SEED, total, perStyle: PER_STYLE, rows });

const bad = rows.filter((r) => r.mismatched > 0);
const lines = [
  "# Step 1 · 앱 엔진 ↔ 설계서 독립 구현 차분",
  "",
  `엔진 ${SCORING_VERSION} · 입력 ${total}세트(시드 ${SEED}, 스타일별 ${Object.entries(PER_STYLE).map(([k, v]) => `${k} ${v}`).join(", ")}) · 비교 필드 ${rows.length}개 · 불일치 필드 ${bad.length}개`,
  "",
  "독립 구현(`scripts/reference-scorer.ts`)은 설계서 텍스트만 보고 작성했다. 근거·가정은 `reference-notes.md`. 불일치는 둘 중 하나가 설계서와 어긋났거나, 설계서가 모호해 두 구현이 다르게 해석한 지점이다.",
  "",
  "| 필드 | 불일치 / 비교 | 예시 (앱 vs 독립) |",
  "|---|---:|---|",
  ...bad.sort((a, b) => b.mismatched - a.mismatched).map((r) => `| \`${r.path}\` | ${r.mismatched} / ${r.compared} | ${r.examples.slice(0, 2).map((e) => `${e.style}: ${JSON.stringify(e.app)} vs ${JSON.stringify(e.ref)}`).join("<br>")} |`),
  "",
  `일치 필드: ${rows.filter((r) => r.mismatched === 0).map((r) => `\`${r.path}\``).join(", ")}`,
];
writeText(vpath("analysis", "engine-diff.md"), `${lines.join("\n")}\n`);
console.log(lines.slice(0, 3 + Math.min(bad.length, 30) + 6).join("\n"));
