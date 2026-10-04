// Step 6: 정답지·채점 결과·리포트·판정을 모아 정확도와 편향 지표를 계산한다.
// 출력: analysis/metrics.json, analysis/metrics.md, analysis/dashboard.html
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { DISPLAY_ORDER, ITEM_BY_ID, PART1 } from "../../src/data/items";
import { CORE, SCHEMAS, VALUES } from "../../src/data/content";
import { SCORING_VERSION } from "../../src/lib/scoring";
import {
  CORE_TYPES, SCHEMA_CODES, VALUE_CODES,
  type AssessmentResult, type Answers, type ChoiceAnswer, type CoreType, type LikertValue,
} from "../../src/types/assessment";
import { ITEM_TO_NEUTRAL, readJson, vpath, writeJson, writeText } from "./common";
import { personalSections, readSections, sentences } from "./report-text";
import { countBy, pct, quantiles, summarize, type Summary } from "./summary";

// ── 입력 ─────────────────────────────────────────────────────────
type Level = "low" | "mid" | "high";
interface Behavior {
  age: number; age_band: string; motivation: string; focus: string; reading_speed: string; condition_today: string;
  digital_literacy: string; psych_term_familiarity: string; social_desirability: string; prior_knowledge: string;
  believed_core: CoreType | null; hard_period: string | null;
}
interface Truth {
  id: string; alias: string; design_intent?: string[]; response_style: string;
  case?: { primary: string; secondary: string | null };
  supporting_level?: Level;
  behavior?: Behavior;
  self_image_gap?: { level: "none" | "small" | "large"; description: string };
  mbti?: { type: string; fit_note: string; self_reported: string | null };
  core: { primary: CoreType; secondary: CoreType; primary_strength: string };
  channel: string; attachment: { ANX: Level; AVO: Level };
  schema_top3: string[]; schema_low?: string[]; values_top3: string[]; state_band: string;
  stress: { vulnerable: string[]; reactivity: Level; dominant_coping: string[] };
  expected_flags: { counterevidence: boolean; reinforcement: boolean; undetermined: boolean; weak_motive: boolean };
}

const ids = readdirSync(vpath("truth")).filter((f) => /^p\d{2}_truth\.json$/.test(f)).map((f) => f.slice(0, 3)).sort();
const truth = new Map(ids.map((id) => [id, readJson<Truth>(vpath("truth", `${id}_truth.json`))]));
const RUNS = ["run1", "run2"] as const;
type Run = (typeof RUNS)[number];
const has = (id: string, run: Run) => existsSync(vpath("results", `${id}_${run}.json`));
const result = (id: string, run: Run) => readJson<AssessmentResult>(vpath("results", `${id}_${run}.json`));
const answers = (id: string, run: Run) => readJson<Answers>(vpath("responses", `${id}_${run}.json`));
const records = ids.flatMap((id) => RUNS.filter((run) => has(id, run)).map((run) => ({ id, run, t: truth.get(id)!, r: result(id, run) })));

const band3 = (x: number): Level => (x < 40 ? "low" : x < 60 ? "mid" : "high");
const overlap = (a: readonly string[], b: readonly string[]) => a.filter((x) => b.includes(x)).length;
const jaccard = (a: readonly string[], b: readonly string[]) => {
  const u = new Set([...a, ...b]);
  return u.size === 0 ? 1 : overlap([...new Set(a)], [...new Set(b)]) / u.size;
};
const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
const rate = (xs: readonly boolean[]) => mean(xs.map((x) => (x ? 1 : 0)));
const coreName = (t: string) => (t in CORE ? CORE[t as CoreType].name : t);

// ── 1. 정확도 ────────────────────────────────────────────────────
const acc = records.map(({ id, run, t, r }) => {
  const tied = [r.core.primary, ...r.core.tiedWith];
  const flagsGot = {
    counterevidence: r.insights.counterevidence !== null,
    reinforcement: r.insights.reinforcements.some((x) => x.coreRole === "primary"),
    undetermined: r.core.status === "undetermined",
    weak_motive: r.core.weakMotive,
  };
  return {
    id, run, style: t.response_style,
    intent: t.case ? [t.case.primary ?? "엣지(Case 없음)", ...(t.case.secondary ? [`${t.case.secondary}(보조)`] : [])] : (t.design_intent ?? []),
    truthPrimary: t.core.primary, resultPrimary: r.core.primary, status: r.core.status,
    confidence: r.core.confidence,
    coreTop1: r.core.primary === t.core.primary,
    coreTop1OrTied: tied.includes(t.core.primary),
    coreTop2: r.core.ranking.slice(0, 2).includes(t.core.primary),
    secondaryTop3: r.core.ranking.slice(0, 3).includes(t.core.secondary),
    anx: band3(r.attachment.ANX) === t.attachment.ANX,
    avo: band3(r.attachment.AVO) === t.attachment.AVO,
    anxScore: r.attachment.ANX, avoScore: r.attachment.AVO,
    schemaOverlap: overlap(r.schemaRanking.slice(0, 3), t.schema_top3) / 3,
    schemaLowAvoided: !(t.schema_low ?? []).some((s) => r.schemaRanking.slice(0, 3).includes(s as never)),
    valueOverlap: overlap(r.values.top3, t.values_top3) / 3,
    valueTop1: (r.values.first as string[]).includes(t.values_top3[0]), // 공동 1위에 포함되면 일치
    state: r.state.band === t.state_band,
    reactivity: r.stress.reactivityBand === t.stress.reactivity,
    vulnerable: jaccard(r.stress.vulnerable, t.stress.vulnerable),
    coping: t.stress.dominant_coping.some((c) => r.stress.dominantCoping.includes(c as never)),
    channel: r.core.channel.primary === t.channel,
    flagsExpected: t.expected_flags, flagsGot,
  };
});
type Acc = (typeof acc)[number];

function accuracySummary(rows: readonly Acc[]) {
  return {
    n: rows.length,
    coreTop1: rate(rows.map((a) => a.coreTop1)),
    coreTop1OrTied: rate(rows.map((a) => a.coreTop1OrTied)),
    coreTop2: rate(rows.map((a) => a.coreTop2)),
    secondaryTop3: rate(rows.map((a) => a.secondaryTop3)),
    anx: rate(rows.map((a) => a.anx)),
    avo: rate(rows.map((a) => a.avo)),
    schemaOverlap: mean(rows.map((a) => a.schemaOverlap)),
    schemaLowAvoided: rate(rows.map((a) => a.schemaLowAvoided)),
    valueOverlap: mean(rows.map((a) => a.valueOverlap)),
    valueTop1: rate(rows.map((a) => a.valueTop1)),
    state: rate(rows.map((a) => a.state)),
    reactivity: rate(rows.map((a) => a.reactivity)),
    vulnerable: mean(rows.map((a) => a.vulnerable)),
    coping: rate(rows.map((a) => a.coping)),
    channel: rate(rows.map((a) => a.channel)),
  };
}

const FLAGS = ["counterevidence", "reinforcement", "undetermined", "weak_motive"] as const;
const flagTable = Object.fromEntries(FLAGS.map((f) => {
  const tp = acc.filter((a) => a.flagsExpected[f] && a.flagsGot[f]).length;
  const fn = acc.filter((a) => a.flagsExpected[f] && !a.flagsGot[f]).length;
  const fp = acc.filter((a) => !a.flagsExpected[f] && a.flagsGot[f]).length;
  const tn = acc.filter((a) => !a.flagsExpected[f] && !a.flagsGot[f]).length;
  return [f, { tp, fn, fp, tn, recall: tp + fn ? tp / (tp + fn) : NaN, precision: tp + fp ? tp / (tp + fp) : NaN }];
}));

const intents = [...new Set(acc.flatMap((a) => a.intent))].sort();
const byIntent = Object.fromEntries(intents.map((k) => [k, accuracySummary(acc.filter((a) => a.intent.includes(k)))]));
const styles = [...new Set(acc.map((a) => a.style))];
const byStyle = Object.fromEntries(styles.map((k) => [k, accuracySummary(acc.filter((a) => a.style === k))]));
const byCore = Object.fromEntries(CORE_TYPES.map((c) => [c, accuracySummary(acc.filter((a) => a.truthPrimary === c && a.style === "normal"))]));

// 행동 변수별 정확도 (집중력·동기·사회적 바람직성·사전지식·디지털·연령·자기인식 차이·힘든 시기)
const SUBGROUPS: [string, (t: Truth) => string | undefined][] = [
  ["집중력", (t) => t.behavior?.focus], ["검사 동기", (t) => t.behavior?.motivation],
  ["사회적 바람직성", (t) => t.behavior?.social_desirability], ["사전 지식", (t) => t.behavior?.prior_knowledge],
  ["디지털 익숙도", (t) => t.behavior?.digital_literacy], ["연령대", (t) => t.behavior?.age_band],
  ["자기인식 차이", (t) => t.self_image_gap?.level], ["힘든 시기", (t) => (t.behavior ? (t.behavior.hard_period ? "있음" : "없음") : undefined)],
  ["Supporting 수준", (t) => t.supporting_level],
];
const bySubgroup = Object.fromEntries(SUBGROUPS.map(([name, key]) => {
  const levels = [...new Set(ids.map((id) => key(truth.get(id)!)).filter((x): x is string => !!x))].sort();
  return [name, Object.fromEntries(levels.map((lv) => [lv, accuracySummary(acc.filter((a) => key(truth.get(a.id)!) === lv))]))];
}));
// 자기 성향을 확신하는 사람: 결과가 실제 성향과 믿는 성향 중 어디로 갔나
const believers = acc.filter((a) => truth.get(a.id)!.behavior?.believed_core).map((a) => {
  const believed = truth.get(a.id)!.behavior!.believed_core!;
  return { id: a.id, run: a.run, truth: a.truthPrimary, believed, result: a.resultPrimary, toTruth: a.resultPrimary === a.truthPrimary, toBelief: a.resultPrimary === believed };
});
// MBTI(정답지 속성)와 결과의 관계: MBTI는 앱이 측정하지 않으므로 맞고 틀림이 아니라 겹침만 본다.
const mbtiRows = acc.filter((a) => a.run === "run1" && truth.get(a.id)!.mbti).map((a) => {
  const t = truth.get(a.id)!;
  const r = records.find((x) => x.id === a.id && x.run === "run1")!.r;
  return { id: a.id, mbti: t.mbti!.type, selfReported: t.mbti!.self_reported, truthCore: a.truthPrimary, resultCore: a.resultPrimary, coreTop1: a.coreTop1, anx: r.attachment.ANX, avo: r.attachment.AVO, channel: r.core.channel.primary, valueTop1: r.values.first.join("·") };
});
const mbtiAxes = (["EI", "SN", "TF", "JP"] as const).map((axis, i) => ({
  axis,
  groups: [...axis].map((letter) => {
    const g = mbtiRows.filter((m) => m.mbti[i] === letter);
    return { letter, n: g.length, anx: mean(g.map((m) => m.anx)), avo: mean(g.map((m) => m.avo)), coreTop1: rate(g.map((m) => m.coreTop1)), resultCore: countBy(g, (m) => m.resultCore), valueTop1: countBy(g, (m) => m.valueTop1) };
  }),
}));
/** 페르소나 단위 정확도 합성값(run1): Core Top1·ANX·AVO·Schema Top3·Value Top3·STATE의 평균 */
const accuracyComposite = (a: Acc) => mean([a.coreTop1 ? 1 : 0, a.anx ? 1 : 0, a.avo ? 1 : 0, a.schemaOverlap, a.valueOverlap, a.state ? 1 : 0]);

// ── 2. 안정성(run1 ↔ run2) ───────────────────────────────────────
const pairs = ids.filter((id) => has(id, "run1") && has(id, "run2")).map((id) => {
  const [a, b] = [result(id, "run1"), result(id, "run2")];
  const [x, y] = [answers(id, "run1"), answers(id, "run2")];
  const likert = DISPLAY_ORDER.filter((q) => ITEM_BY_ID.get(q)!.kind === "likert");
  const diffs = likert.map((q) => Math.abs((x[q] as LikertValue) - (y[q] as LikertValue)));
  return {
    id,
    primary: a.core.primary === b.core.primary,
    top2Set: jaccard(a.core.ranking.slice(0, 2), b.core.ranking.slice(0, 2)) === 1,
    schemaOverlap: overlap(a.schemaRanking.slice(0, 3), b.schemaRanking.slice(0, 3)) / 3,
    valueOverlap: overlap(a.values.top3, b.values.top3) / 3,
    state: a.state.band === b.state.band,
    anxDiff: Math.abs(a.attachment.ANX - b.attachment.ANX),
    avoDiff: Math.abs(a.attachment.AVO - b.attachment.AVO),
    confidenceDiff: Math.abs(a.core.confidence - b.core.confidence),
    likertExact: rate(diffs.map((d) => d === 0)),
    likertWithin1: rate(diffs.map((d) => d <= 1)),
    part1First: rate(PART1.map((i) => (x[i.id] as ChoiceAnswer).first === (y[i.id] as ChoiceAnswer).first)),
  };
});
const stability = pairs.length ? {
  n: pairs.length,
  primary: rate(pairs.map((p) => p.primary)), top2Set: rate(pairs.map((p) => p.top2Set)),
  schemaOverlap: mean(pairs.map((p) => p.schemaOverlap)), valueOverlap: mean(pairs.map((p) => p.valueOverlap)),
  state: rate(pairs.map((p) => p.state)), anxDiff: mean(pairs.map((p) => p.anxDiff)), avoDiff: mean(pairs.map((p) => p.avoDiff)),
  confidenceDiff: mean(pairs.map((p) => p.confidenceDiff)),
  likertExact: mean(pairs.map((p) => p.likertExact)), likertWithin1: mean(pairs.map((p) => p.likertWithin1)), part1First: mean(pairs.map((p) => p.part1First)),
  unstablePrimary: pairs.filter((p) => !p.primary).map((p) => p.id),
} : null;

// ── 3. 편향 ──────────────────────────────────────────────────────
const normalAcc = acc.filter((a) => a.style === "normal");
const confusion = Object.fromEntries(CORE_TYPES.map((tr) => [tr, Object.fromEntries(CORE_TYPES.map((rs) => [rs, normalAcc.filter((a) => a.truthPrimary === tr && a.resultPrimary === rs).length]))]));
const resultRows = records.map((x) => x.r);
const personaSummary: Summary = summarize(resultRows);
const intended = {
  primary: countBy(records, (x) => x.t.core.primary, CORE_TYPES),
  valueTop1: countBy(records, (x) => x.t.values_top3[0], VALUE_CODES),
  schemaTop1: countBy(records, (x) => x.t.schema_top3[0], SCHEMA_CODES),
  state: countBy(records, (x) => x.t.state_band, ["expansion", "balanced", "protection"]),
};
const observed = {
  primary: countBy(records, (x) => x.r.core.primary, CORE_TYPES),
  valueTop1: countBy(records, (x) => x.r.values.first[0], VALUE_CODES), // 공동 1위면 보정 점수가 가장 높은 가치
  schemaTop1: countBy(records, (x) => x.r.schemaRanking[0], SCHEMA_CODES),
  state: countBy(records, (x) => x.r.state.band, ["expansion", "balanced", "protection"]),
};
const montecarlo = existsSync(vpath("analysis", "montecarlo.json")) ? readJson<{ summaries: Record<string, Summary> }>(vpath("analysis", "montecarlo.json")).summaries.uniform : null;

// ── 4. 리포트 문장 유사도·바넘 후보 ──────────────────────────────
const reportFiles = records.filter(({ id, run }) => existsSync(vpath("reports", `${id}_${run}.md`)));
let similarity: null | {
  sectionsDropped: number; perReportSentences: number;
  crossPersona: { mean: number; max: number }; samePersona: { mean: number };
  uniqueShare: number; barnum: { sentence: string; share: number }[]; universal: number;
} = null;
if (reportFiles.length >= 4) {
  const raw = reportFiles.map(({ id, run }) => readSections(vpath("reports", `${id}_${run}.md`)));
  const personal = personalSections(raw);
  const sets = new Map(reportFiles.map(({ id, run }, i) => [`${id}_${run}`, new Set(sentences(personal[i].join("\n")))]));
  const j = (a: Set<string>, b: Set<string>) => { let n = 0; for (const s of a) if (b.has(s)) n++; return n / (a.size + b.size - n || 1); };
  const run1 = ids.filter((id) => sets.has(`${id}_run1`));
  const cross: number[] = [];
  for (let i = 0; i < run1.length; i++) for (let k = i + 1; k < run1.length; k++) cross.push(j(sets.get(`${run1[i]}_run1`)!, sets.get(`${run1[k]}_run1`)!));
  const same = ids.filter((id) => sets.has(`${id}_run1`) && sets.has(`${id}_run2`)).map((id) => j(sets.get(`${id}_run1`)!, sets.get(`${id}_run2`)!));
  const df = new Map<string, number>();
  for (const id of run1) for (const s of sets.get(`${id}_run1`)!) df.set(s, (df.get(s) ?? 0) + 1);
  const shares = [...df.entries()].map(([sentence, n]) => ({ sentence, share: n / run1.length }));
  const perReport = run1.map((id) => [...sets.get(`${id}_run1`)!]);
  similarity = {
    sectionsDropped: raw[0].length - personal[0].length,
    perReportSentences: mean(perReport.map((s) => s.length)),
    crossPersona: { mean: mean(cross), max: Math.max(...cross) },
    samePersona: { mean: mean(same) },
    uniqueShare: mean(perReport.map((s) => s.filter((x) => df.get(x) === 1).length / (s.length || 1))),
    barnum: shares.filter((s) => s.share >= 0.3 && s.share < 1).sort((a, b) => b.share - a.share).slice(0, 40),
    universal: shares.filter((s) => s.share === 1).length,
  };
}

// ── 5. 문항 변별력·쌍 문항 일관성 ─────────────────────────────────
const run1Answers = ids.filter((id) => has(id, "run1")).map((id) => answers(id, "run1"));
const allAnswers = records.map(({ id, run }) => answers(id, run));
const sd = (xs: number[]) => { const m = mean(xs); return Math.sqrt(mean(xs.map((x) => (x - m) ** 2))); };
const itemStats = DISPLAY_ORDER.filter((q) => ITEM_BY_ID.get(q)!.kind === "likert").map((q) => {
  const item = ITEM_BY_ID.get(q)!;
  const xs = run1Answers.map((a) => a[q] as number);
  const dist = [1, 2, 3, 4, 5].map((v) => xs.filter((x) => x === v).length);
  return { id: q, q: ITEM_TO_NEUTRAL.get(q)!, code: item.kind === "likert" ? item.code : "", reverse: item.kind === "likert" && item.reverse, mean: mean(xs), sd: sd(xs), dist };
});
const pearson = (a: number[], b: number[]) => {
  const [ma, mb] = [mean(a), mean(b)];
  const num = a.reduce((s, x, i) => s + (x - ma) * (b[i] - mb), 0);
  const den = Math.sqrt(a.reduce((s, x) => s + (x - ma) ** 2, 0) * b.reduce((s, x) => s + (x - mb) ** 2, 0));
  return den ? num / den : NaN;
};
const codes = [...new Set(itemStats.map((s) => s.code))];
const pairConsistency = codes.map((code) => {
  const items = itemStats.filter((s) => s.code === code);
  if (items.length < 2) return null;
  const scored = items.map((s) => allAnswers.map((a) => (s.reverse ? 6 - (a[s.id] as number) : (a[s.id] as number))));
  const rs: number[] = [];
  for (let i = 0; i < scored.length; i++) for (let k = i + 1; k < scored.length; k++) rs.push(pearson(scored[i], scored[k]));
  return { code, items: items.map((s) => s.id), meanR: mean(rs), minR: Math.min(...rs) };
}).filter((x): x is NonNullable<typeof x> => x !== null);
const part1Stats = PART1.map((item) => {
  const firsts = allAnswers.map((a) => (a[item.id] as ChoiceAnswer).first);
  const dist = Object.fromEntries(item.options.map((o) => [o.key, firsts.filter((f) => f === o.key).length]));
  const n = firsts.length || 1;
  const h = -Object.values(dist).reduce((s, c) => (c ? s + (c / n) * Math.log(c / n) : s), 0) / Math.log(item.options.length);
  return { id: item.id, q: ITEM_TO_NEUTRAL.get(item.id)!, dist, evenness: h, types: item.options.map((o) => `${o.key}:${coreName(o.type)}`).join(" ") };
});

// ── 6. bio ↔ 문항 누출 검사 ──────────────────────────────────────
const tokens = (s: string) => s.replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
const bigrams = (s: string) => { const t = tokens(s); return t.slice(1).map((w, i) => `${t[i]} ${w}`); };
const itemTexts = DISPLAY_ORDER.flatMap((q) => {
  const item = ITEM_BY_ID.get(q)!;
  return item.kind === "likert" ? [{ id: q, text: item.text }] : item.options.map((o) => ({ id: `${q}${o.key}`, text: o.text }));
});
const leaks = ids.flatMap((id) => {
  const bio = new Set(bigrams(readFileSync(vpath("personas", `${id}_bio.md`), "utf8")));
  return itemTexts.map(({ id: item, text }) => {
    const bg = bigrams(text);
    const hit = bg.filter((b) => bio.has(b)).length;
    return { persona: id, item, text, hit, share: bg.length ? hit / bg.length : 0 };
  }).filter((x) => x.hit >= 2 && x.share >= 0.4);
}).sort((a, b) => b.share - a.share);

// ── 7. 골라내기 테스트 ───────────────────────────────────────────
interface Verdict { choice: string; ranking?: string[]; confidence: number; reason?: string; generic?: string[] }
let judge: null | {
  n: number; hit: number; hitRate: number; chance: number; top2Rate: number; sameCoreDistractorChosen: number;
  byConfidence: Record<string, { n: number; hitRate: number }>; misses: { trial: string; persona: string; chose: string; reason: string }[];
  generic: { sentence: string; count: number }[];
} = null;
if (existsSync(vpath("judge", "key.json")) && existsSync(vpath("judge", "verdicts"))) {
  const key = readJson<{ trials: Record<string, { persona: string; answer: string; options: Record<string, string>; sameCoreDistractor: string }> }>(vpath("judge", "key.json")).trials;
  const verdicts = Object.keys(key).filter((t) => existsSync(vpath("judge", "verdicts", `${t}.json`))).map((t) => ({ t, k: key[t], v: readJson<Verdict>(vpath("judge", "verdicts", `${t}.json`)) }));
  const generic = new Map<string, number>();
  for (const { v } of verdicts) for (const g of v.generic ?? []) generic.set(g.trim(), (generic.get(g.trim()) ?? 0) + 1);
  const conf = [...new Set(verdicts.map((x) => x.v.confidence))].sort();
  judge = {
    n: verdicts.length,
    hit: verdicts.filter((x) => x.v.choice === x.k.answer).length,
    hitRate: rate(verdicts.map((x) => x.v.choice === x.k.answer)),
    chance: 0.25,
    top2Rate: rate(verdicts.map((x) => (x.v.ranking ?? [x.v.choice]).slice(0, 2).includes(x.k.answer))),
    sameCoreDistractorChosen: rate(verdicts.map((x) => x.k.options[x.v.choice] === x.k.sameCoreDistractor)),
    byConfidence: Object.fromEntries(conf.map((c) => { const g = verdicts.filter((x) => x.v.confidence === c); return [String(c), { n: g.length, hitRate: rate(g.map((x) => x.v.choice === x.k.answer)) }]; })),
    misses: verdicts.filter((x) => x.v.choice !== x.k.answer).map((x) => ({ trial: x.t, persona: x.k.persona, chose: x.k.options[x.v.choice] ?? x.v.choice, reason: x.v.reason ?? "" })),
    generic: [...generic.entries()].map(([sentence, count]) => ({ sentence, count })).sort((a, b) => b.count - a.count).slice(0, 25),
  };
}

// ── 8. 응답 경험(UX) ─────────────────────────────────────────────
interface Ux {
  overall: { perceived_minutes: number; boredom: number; difficulty: number; fatigue_from: string | null; would_finish_in_real_life: string; dropout_point: string | null; comment: string };
  parts: { part: number; perceived_length: string; boredom: number; difficulty: number; note: string }[];
  transition_1_to_2: { burden: number; note: string };
  hard_items: { q: string; reason: string; detail: string }[];
  careless_items: string[];
  emotional: { uncomfortable: boolean; note: string };
}
const neutralToItem = new Map([...ITEM_TO_NEUTRAL.entries()].map(([item, q]) => [q, item]));
const itemText = (itemId: string) => {
  const it = ITEM_BY_ID.get(itemId);
  return !it ? "" : it.kind === "likert" ? it.text : it.stem;
};
/** 응답 데이터만으로 본 성의 신호: 5점 문항에서 같은 값이 가장 길게 이어진 길이, 3점 비율 */
const effort = (a: Answers) => {
  const xs = DISPLAY_ORDER.filter((q) => ITEM_BY_ID.get(q)!.kind === "likert").map((q) => a[q] as number);
  let longest = 1, run = 1;
  for (let i = 1; i < xs.length; i++) { run = xs[i] === xs[i - 1] ? run + 1 : 1; longest = Math.max(longest, run); }
  return { longestRun: longest, midShare: rate(xs.map((x) => x === 3)) };
};
const uxRows = ids.filter((id) => existsSync(vpath("responses", "raw", `${id}_run1_ux.json`))).map((id) => ({ id, t: truth.get(id)!, ux: readJson<Ux>(vpath("responses", "raw", `${id}_run1_ux.json`)), eff: has(id, "run1") ? effort(answers(id, "run1")) : null }));
const ux = uxRows.length === 0 ? null : (() => {
  const hard = new Map<string, { count: number; reasons: Record<string, number>; details: string[]; who: string[] }>();
  for (const { id, ux: u } of uxRows) for (const h of u.hard_items ?? []) {
    const e = hard.get(h.q) ?? { count: 0, reasons: {}, details: [], who: [] };
    e.count += 1; e.reasons[h.reason] = (e.reasons[h.reason] ?? 0) + 1; e.who.push(id);
    if (h.detail && e.details.length < 4) e.details.push(h.detail);
    hard.set(h.q, e);
  }
  const groupBy = (key: (t: Truth) => string | undefined) => {
    const levels = [...new Set(uxRows.map((r) => key(r.t)).filter((x): x is string => !!x))].sort();
    return Object.fromEntries(levels.map((lv) => {
      const g = uxRows.filter((r) => key(r.t) === lv);
      return [lv, { n: g.length, boredom: mean(g.map((r) => r.ux.overall.boredom)), difficulty: mean(g.map((r) => r.ux.overall.difficulty)), minutes: mean(g.map((r) => r.ux.overall.perceived_minutes)), finishNo: rate(g.map((r) => r.ux.overall.would_finish_in_real_life === "no")), hardItems: mean(g.map((r) => (r.ux.hard_items ?? []).length)) }];
    }));
  };
  return {
    n: uxRows.length,
    overall: {
      minutes: quantiles(uxRows.map((r) => r.ux.overall.perceived_minutes)),
      boredom: mean(uxRows.map((r) => r.ux.overall.boredom)), difficulty: mean(uxRows.map((r) => r.ux.overall.difficulty)),
      wouldFinish: countBy(uxRows, (r) => r.ux.overall.would_finish_in_real_life, ["yes", "maybe", "no"]),
      dropoutPoints: uxRows.filter((r) => r.ux.overall.dropout_point).map((r) => ({ id: r.id, q: r.ux.overall.dropout_point, item: neutralToItem.get(r.ux.overall.dropout_point ?? "") ?? "" })),
      fatigue: uxRows.filter((r) => r.ux.overall.fatigue_from).map((r) => ({ id: r.id, from: r.ux.overall.fatigue_from })),
    },
    parts: [1, 2, 3, 4, 5, 6].map((part) => {
      const ps = uxRows.map((r) => r.ux.parts?.find((x) => x.part === part)).filter((x): x is NonNullable<typeof x> => !!x);
      return { part, n: ps.length, boredom: mean(ps.map((x) => x.boredom)), difficulty: mean(ps.map((x) => x.difficulty)), length: countBy(ps, (x) => x.perceived_length, ["짧음", "적당", "김"]), notes: ps.map((x) => x.note).filter(Boolean).slice(0, 6) };
    }),
    transition: { burden: mean(uxRows.map((r) => r.ux.transition_1_to_2?.burden ?? NaN).filter((x) => !Number.isNaN(x))), notes: uxRows.map((r) => r.ux.transition_1_to_2?.note).filter(Boolean).slice(0, 8) },
    hardItems: [...hard.entries()].map(([q, e]) => ({ q, item: neutralToItem.get(q) ?? "", text: itemText(neutralToItem.get(q) ?? ""), ...e })).sort((a, b) => b.count - a.count),
    careless: { selfReported: mean(uxRows.map((r) => (r.ux.careless_items ?? []).length)), byPersona: uxRows.map((r) => ({ id: r.id, focus: r.t.behavior?.focus, motivation: r.t.behavior?.motivation, selfReported: (r.ux.careless_items ?? []).length, longestRun: r.eff?.longestRun, midShare: r.eff?.midShare })) },
    emotional: uxRows.filter((r) => r.ux.emotional?.uncomfortable).map((r) => ({ id: r.id, hardPeriod: r.t.behavior?.hard_period ?? null, note: r.ux.emotional.note })),
    byAge: groupBy((t) => t.behavior?.age_band), byFocus: groupBy((t) => t.behavior?.focus), byDigital: groupBy((t) => t.behavior?.digital_literacy), byMotivation: groupBy((t) => t.behavior?.motivation),
    comments: uxRows.map((r) => ({ id: r.id, comment: r.ux.overall.comment })),
  };
})();

// ── 9. 납득도(persona-reader) ─────────────────────────────────────
interface Acceptance {
  read_until: string; overall_fit: number; felt_understood: boolean; trust: number; would_share: string; reading_burden: number;
  sections: { title: string; felt: string; actually_fits: string; note: string }[];
  hit_sentences: string[]; rejected_sentences: { sentence: string; why: string; blind_spot: boolean }[];
  generic_sentences: string[]; uncomfortable_sentences: { sentence: string; why: string }[]; confusing_terms: string[]; comment: string;
}
const accRows = ids.filter((id) => existsSync(vpath("acceptance", `${id}.json`))).map((id) => ({ id, t: truth.get(id)!, a: readJson<Acceptance>(vpath("acceptance", `${id}.json`)), acc: acc.find((x) => x.id === id && x.run === "run1") }));
const acceptance = accRows.length === 0 ? null : (() => {
  const quadrant = (r: (typeof accRows)[number]) => {
    const accurate = r.acc ? accuracyComposite(r.acc) >= 0.6 : false;
    const accepted = r.a.overall_fit >= 4;
    return accurate && accepted ? "정확·납득" : accurate ? "정확·불납득(맹점/전달)" : accepted ? "부정확·납득(바넘 위험)" : "부정확·불납득";
  };
  const sectionPairs = accRows.flatMap((r) => r.a.sections ?? []);
  const felt3 = ["맞다", "애매", "아니다"];
  const terms = new Map<string, number>();
  for (const r of accRows) for (const term of r.a.confusing_terms ?? []) terms.set(term.trim(), (terms.get(term.trim()) ?? 0) + 1);
  const sectionStats = new Map<string, { n: number; feltYes: number; fitsYes: number }>();
  for (const s of sectionPairs) {
    const e = sectionStats.get(s.title) ?? { n: 0, feltYes: 0, fitsYes: 0 };
    e.n += 1; if (s.felt === "맞다") e.feltYes += 1; if (s.actually_fits === "맞다") e.fitsYes += 1;
    sectionStats.set(s.title, e);
  }
  const byGap = Object.fromEntries(["none", "small", "large"].map((lv) => {
    const g = accRows.filter((r) => r.t.self_image_gap?.level === lv);
    return [lv, { n: g.length, fit: mean(g.map((r) => r.a.overall_fit)), rejected: mean(g.map((r) => (r.a.rejected_sentences ?? []).length)), blindSpotRejections: mean(g.map((r) => (r.a.rejected_sentences ?? []).filter((x) => x.blind_spot).length)) }];
  }));
  return {
    n: accRows.length,
    overallFit: mean(accRows.map((r) => r.a.overall_fit)), trust: mean(accRows.map((r) => r.a.trust)),
    feltUnderstood: rate(accRows.map((r) => r.a.felt_understood)), readingBurden: mean(accRows.map((r) => r.a.reading_burden)),
    wouldShare: countBy(accRows, (r) => r.a.would_share, ["yes", "maybe", "no"]),
    readAll: rate(accRows.map((r) => r.a.read_until === "끝까지")),
    quadrants: countBy(accRows, quadrant, ["정확·납득", "정확·불납득(맹점/전달)", "부정확·납득(바넘 위험)", "부정확·불납득"]),
    perPersona: accRows.map((r) => ({ id: r.id, fit: r.a.overall_fit, trust: r.a.trust, accuracy: r.acc ? accuracyComposite(r.acc) : NaN, quadrant: quadrant(r), gap: r.t.self_image_gap?.level, readUntil: r.a.read_until, comment: r.a.comment })),
    feltVsFits: Object.fromEntries(felt3.map((f) => [f, Object.fromEntries(felt3.map((x) => [x, sectionPairs.filter((s) => s.felt === f && s.actually_fits === x).length]))])),
    sections: [...sectionStats.entries()].map(([title, e]) => ({ title, n: e.n, felt: e.feltYes / e.n, fits: e.fitsYes / e.n })).sort((a, b) => a.felt - b.felt),
    byGap,
    blindSpotRejections: accRows.flatMap((r) => (r.a.rejected_sentences ?? []).filter((x) => x.blind_spot).map((x) => ({ id: r.id, ...x }))).slice(0, 15),
    rejected: accRows.flatMap((r) => (r.a.rejected_sentences ?? []).filter((x) => !x.blind_spot).map((x) => ({ id: r.id, ...x }))).slice(0, 25),
    uncomfortable: accRows.flatMap((r) => (r.a.uncomfortable_sentences ?? []).map((x) => ({ id: r.id, hardPeriod: r.t.behavior?.hard_period ?? null, ...x }))),
    hardPeriod: accRows.filter((r) => r.t.behavior?.hard_period).map((r) => ({ id: r.id, period: r.t.behavior!.hard_period, fit: r.a.overall_fit, uncomfortable: (r.a.uncomfortable_sentences ?? []).length, comment: r.a.comment })),
    confusingTerms: [...terms.entries()].map(([term, count]) => ({ term, count })).sort((a, b) => b.count - a.count).slice(0, 20),
    generic: accRows.flatMap((r) => r.a.generic_sentences ?? []).slice(0, 30),
  };
})();

// ── 출력 ─────────────────────────────────────────────────────────
const metrics = {
  scoringVersion: SCORING_VERSION, personas: ids.length, records: records.length,
  accuracy: { all: accuracySummary(acc), normal: accuracySummary(normalAcc), byStyle, byIntent, byCore, bySubgroup, believers, flags: flagTable },
  mbti: { rows: mbtiRows, axes: mbtiAxes },
  ux, acceptance,
  stability, pairs,
  bias: { confusion, intended, observed, personaSummary, montecarloUniform: montecarlo },
  similarity, items: { likert: itemStats, pairConsistency, part1: part1Stats }, leaks, judge,
  perRecord: acc,
};
writeJson(vpath("analysis", "metrics.json"), metrics);

// ── metrics.md ───────────────────────────────────────────────────
const p = (x: number) => (Number.isNaN(x) ? "–" : pct(x, 0));
const dist = (d: Record<string, number>, total: number, label = (k: string) => k) => Object.entries(d).map(([k, v]) => `${label(k)} ${v}(${p(v / (total || 1))})`).join(" · ");
const accRow = (name: string, s: ReturnType<typeof accuracySummary>) =>
  `| ${name} | ${s.n} | ${p(s.coreTop1)} | ${p(s.coreTop2)} | ${p(s.anx)} | ${p(s.avo)} | ${p(s.schemaOverlap)} | ${p(s.valueOverlap)} | ${p(s.valueTop1)} | ${p(s.state)} | ${p(s.reactivity)} | ${p(s.vulnerable)} | ${p(s.coping)} | ${p(s.channel)} |`;
const ACC_HEAD = ["| 묶음 | n | Core Top1 | Core Top2 | ANX 구간 | AVO 구간 | Schema Top3 겹침 | Value Top3 겹침 | Value Top1 | STATE | 반응성 | 취약 트리거(J) | 대처 | 채널 |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|"];
const md: string[] = [
  "# Step 6 · 정확도·편향 지표 (자동 생성)",
  "",
  `엔진 ${SCORING_VERSION} · 페르소나 ${ids.length}명 · 결과 ${records.length}건. 30명 규모의 스모크 테스트이며 통계적 판정이 아니다(ASSUMPTIONS V5).`,
  "",
  "## 1. 정확도",
  "",
  ...ACC_HEAD,
  accRow("전체", metrics.accuracy.all), accRow("일반 응답", metrics.accuracy.normal),
  ...styles.filter((s) => s !== "normal").map((s) => accRow(`스타일: ${s}`, byStyle[s])),
  ...intents.map((k) => accRow(`의도: ${k}`, byIntent[k])),
  "",
  "### 일반 응답 페르소나의 의도 Core별",
  "",
  ...ACC_HEAD,
  ...CORE_TYPES.map((c) => accRow(coreName(c), byCore[c])),
  "",
  "### 플래그 탐지 (의도 vs 결과, 전체 결과 건수 기준)",
  "",
  "| 플래그 | 의도O·결과O | 의도O·결과X | 의도X·결과O | 의도X·결과X | 재현율 | 정밀도 |",
  "|---|---:|---:|---:|---:|---:|---:|",
  ...FLAGS.map((f) => { const x = flagTable[f]; return `| ${f} | ${x.tp} | ${x.fn} | ${x.fp} | ${x.tn} | ${p(x.recall)} | ${p(x.precision)} |`; }),
  "",
  "## 2. 응답 안정성 (run1 ↔ run2)",
  "",
  stability ? [
    `- 페르소나 ${stability.n}명 · Primary 일치 ${p(stability.primary)} · Top2 집합 일치 ${p(stability.top2Set)} · Schema Top3 겹침 ${p(stability.schemaOverlap)} · Value Top3 겹침 ${p(stability.valueOverlap)} · STATE 일치 ${p(stability.state)}`,
    `- 평균 차이: ANX ${stability.anxDiff.toFixed(1)} · AVO ${stability.avoDiff.toFixed(1)} · CoreConfidence ${stability.confidenceDiff.toFixed(1)}`,
    `- 문항 수준: 5점 완전 일치 ${p(stability.likertExact)} · ±1 이내 ${p(stability.likertWithin1)} · Part 1 1순위 일치 ${p(stability.part1First)}`,
    `- Primary가 바뀐 페르소나: ${stability.unstablePrimary.join(", ") || "없음"}`,
  ].join("\n") : "- run2 결과 없음",
  "",
  "## 3. 편향",
  "",
  `- Primary(결과): ${dist(observed.primary, records.length, coreName)}`,
  `- Primary(의도): ${dist(intended.primary, records.length, coreName)}`,
  `- Value Top1(결과): ${dist(observed.valueTop1, records.length)}`,
  `- Value Top1(의도): ${dist(intended.valueTop1, records.length)}`,
  `- Schema Top1(결과): ${dist(observed.schemaTop1, records.length)}`,
  `- Schema Top1(의도): ${dist(intended.schemaTop1, records.length)}`,
  `- STATE(결과): ${dist(observed.state, records.length)} / (의도): ${dist(intended.state, records.length)}`,
  `- CoreConfidence: 중앙값 ${quantiles(acc.map((a) => a.confidence)).p50.toFixed(1)} · 구간 ${Object.entries(personaSummary.core.confidenceBand).map(([k, v]) => `${k} ${p(v)}`).join(" · ")}`,
  `- 판정 유보 ${p(personaSummary.core.undetermined)} · 반증 ${p(personaSummary.insights.counterevidence)} · 강화 ${p(personaSummary.insights.anyReinforcement)} · 동기 약함 ${p(personaSummary.core.weakMotive)} · 일관성 플래그 ${p(personaSummary.consistencyFlag)}`,
  montecarlo ? `- 비교(무작위 기준선): Value Top1 EXP ${p(montecarlo.values.top1.EXP)} · 반증 ${p(montecarlo.insights.counterevidence)} · 강화 ${p(montecarlo.insights.anyReinforcement)}` : "",
  "",
  "### Core 혼동행렬 (일반 응답, 행=의도, 열=결과)",
  "",
  `| 의도＼결과 | ${CORE_TYPES.map(coreName).join(" | ")} |`,
  `|---|${CORE_TYPES.map(() => "---:").join("|")}|`,
  ...CORE_TYPES.map((tr) => `| ${coreName(tr)} | ${CORE_TYPES.map((rs) => (confusion[tr][rs] ? (tr === rs ? `**${confusion[tr][rs]}**` : String(confusion[tr][rs])) : "·")).join(" | ")} |`),
  "",
  "## 4. 리포트 문장 유사도",
  "",
  similarity ? [
    `- 모든 리포트에 똑같은 고정 섹션 ${similarity.sectionsDropped}개를 제외하고 비교. 리포트당 문장 ${similarity.perReportSentences.toFixed(0)}개.`,
    `- 다른 사람끼리 문장 Jaccard 평균 ${similarity.crossPersona.mean.toFixed(3)} (최대 ${similarity.crossPersona.max.toFixed(3)}) · 같은 사람 run1↔run2 평균 ${similarity.samePersona.mean.toFixed(3)}`,
    `- 리포트 문장 중 그 사람에게만 나온 문장 비율 평균 ${p(similarity.uniqueShare)} · 개인화 섹션 안에서도 30명 모두에게 나온 문장 ${similarity.universal}개`,
    "",
    "### 바넘 후보 (30% 이상 ~ 100% 미만의 리포트에 나온 문장, 숫자는 #)",
    "",
    "| 비율 | 문장 |", "|---:|---|",
    ...similarity.barnum.map((b) => `| ${p(b.share)} | ${b.sentence.replace(/\|/g, "\\|").slice(0, 160)} |`),
  ].join("\n") : "- 리포트 없음",
  "",
  "## 5. 문항",
  "",
  "### 변별력이 낮은 5점 문항 (run1 30명, SD < 0.8 또는 평균 ≤ 1.7 / ≥ 4.3)",
  "",
  "| 문항 | 화면 | 코드 | 평균 | SD | 1–5 분포 |", "|---|---|---|---:|---:|---|",
  ...itemStats.filter((s) => s.sd < 0.8 || s.mean <= 1.7 || s.mean >= 4.3).sort((a, b) => a.sd - b.sd).map((s) => `| ${s.id}${s.reverse ? "(R)" : ""} | ${s.q} | ${s.code} | ${s.mean.toFixed(2)} | ${s.sd.toFixed(2)} | ${s.dist.join("/")} |`),
  "",
  "### 같은 코드 문항 간 상관 (역채점 반영, 전체 결과)",
  "",
  "| 코드 | 문항 | 평균 r | 최소 r |", "|---|---|---:|---:|",
  ...pairConsistency.sort((a, b) => a.meanR - b.meanR).map((c) => `| ${c.code} | ${c.items.join(", ")} | ${c.meanR.toFixed(2)} | ${c.minR.toFixed(2)} |`),
  "",
  "### Part 1 문항별 1순위 분포 (균등도 낮은 순)",
  "",
  "| 문항 | A/B/C/D | 균등도 | 선택지 Core |", "|---|---|---:|---|",
  ...[...part1Stats].sort((a, b) => a.evenness - b.evenness).map((s) => `| ${s.id} (${s.q}) | ${Object.values(s.dist).join("/")} | ${s.evenness.toFixed(2)} | ${s.types} |`),
  "",
  "## 6. bio ↔ 문항 누출 검사",
  "",
  `- 문항(또는 선택지) 어절 2-gram의 40% 이상·2개 이상이 bio에 그대로 나온 경우: ${leaks.length}건`,
  ...leaks.slice(0, 15).map((l) => `  - ${l.persona} · ${l.item} (${p(l.share)}): ${l.text}`),
  "",
  "## 8. 행동 변수별 정확도",
  "",
  ...Object.entries(bySubgroup).flatMap(([name, groups]) => [`### ${name}`, "", ...ACC_HEAD, ...Object.entries(groups).map(([lv, s]) => accRow(lv, s)), ""]),
  "### 자기 성향을 확신하는 사람",
  "",
  ...(believers.length ? believers.map((b) => `- ${b.id} ${b.run}: 실제 ${coreName(b.truth)} · 믿음 ${coreName(b.believed)} → 결과 ${coreName(b.result)} (${b.toTruth ? "실제 성향" : b.toBelief ? "믿는 성향" : "둘 다 아님"})`) : ["- 해당 없음"]),
  "",
  "### MBTI (정답지 속성, 앱은 측정하지 않음)",
  "",
  ...(mbtiRows.length ? [
    "| id | MBTI | 본인이 아는 MBTI | 의도 Core | 결과 Core | ANX | AVO | 채널 | Value Top1 |", "|---|---|---|---|---|---:|---:|---|---|",
    ...mbtiRows.map((m) => `| ${m.id} | ${m.mbti} | ${m.selfReported ?? "–"} | ${coreName(m.truthCore)} | ${coreName(m.resultCore)}${m.coreTop1 ? "" : " ✗"} | ${m.anx.toFixed(0)} | ${m.avo.toFixed(0)} | ${m.channel} | ${m.valueTop1} |`),
    "",
    "| 축 | 글자 | n | ANX 평균 | AVO 평균 | Core 적중 | 결과 Core 분포 |", "|---|---|---:|---:|---:|---:|---|",
    ...mbtiAxes.flatMap((a) => a.groups.map((g) => `| ${a.axis} | ${g.letter} | ${g.n} | ${g.anx.toFixed(1)} | ${g.avo.toFixed(1)} | ${p(g.coreTop1)} | ${Object.entries(g.resultCore).map(([k, v]) => `${coreName(k)} ${v}`).join(", ")} |`)),
  ] : ["- MBTI 정보 없음"]),
  "",
  "## 9. 응답 경험",
  "",
  ux ? [
    `- 응답 경험 기록 ${ux.n}명 · 체감 시간 중앙값 ${ux.overall.minutes.p50}분 (p10 ${ux.overall.minutes.p10} – p90 ${ux.overall.minutes.p90}) · 지루함 평균 ${ux.overall.boredom.toFixed(2)}/5 · 어려움 평균 ${ux.overall.difficulty.toFixed(2)}/5`,
    `- 실제라면 끝까지 할까: ${dist(ux.overall.wouldFinish, ux.n)}`,
    `- Part 1→2 전환 부담 평균 ${ux.transition.burden.toFixed(2)}/5`,
    `- 중단 지점: ${ux.overall.dropoutPoints.map((d) => `${d.id} ${d.q}(${d.item})`).join(", ") || "없음"}`,
    `- 피로 시작: ${ux.overall.fatigue.map((f) => `${f.id} ${f.from}`).join(" / ") || "없음"}`,
    "",
    "### Part별",
    "",
    "| Part | n | 지루함 | 어려움 | 체감 길이(짧음/적당/김) | 메모 |", "|---|---:|---:|---:|---|---|",
    ...ux.parts.map((x) => `| ${x.part} | ${x.n} | ${x.boredom.toFixed(2)} | ${x.difficulty.toFixed(2)} | ${x.length["짧음"]}/${x.length["적당"]}/${x.length["김"]} | ${x.notes.slice(0, 3).join(" / ").replace(/\|/g, "\\|")} |`),
    "",
    "### 어렵거나 모호하다고 지목된 문항 (지목 수 순)",
    "",
    "| 화면 | 문항 | 지목 | 이유 | 문장 | 상세 |", "|---|---|---:|---|---|---|",
    ...ux.hardItems.slice(0, 25).map((h) => `| ${h.q} | ${h.item} | ${h.count} | ${Object.entries(h.reasons).map(([k, v]) => `${k} ${v}`).join(", ")} | ${h.text.replace(/\|/g, "\\|")} | ${h.details.slice(0, 2).join(" / ").replace(/\|/g, "\\|")} |`),
    "",
    "### 집단별 경험",
    "",
    "| 묶음 | n | 지루함 | 어려움 | 체감 분 | 중단 의향(no) | 지목 문항 수 |", "|---|---:|---:|---:|---:|---:|---:|",
    ...([["연령", ux.byAge], ["집중력", ux.byFocus], ["디지털", ux.byDigital], ["동기", ux.byMotivation]] as const).flatMap(([name, g]) => Object.entries(g).map(([lv, x]) => `| ${name}: ${lv} | ${x.n} | ${x.boredom.toFixed(2)} | ${x.difficulty.toFixed(2)} | ${x.minutes.toFixed(0)} | ${p(x.finishNo)} | ${x.hardItems.toFixed(1)} |`)),
    "",
    "### 성의 신호 (자기보고 vs 응답 데이터)",
    "",
    "| 페르소나 | 집중력 | 동기 | 대충 고른 문항(자기보고) | 같은 값 최장 연속 | 3점 비율 |", "|---|---|---|---:|---:|---:|",
    ...ux.careless.byPersona.filter((x) => x.focus === "low" || x.selfReported > 0 || (x.longestRun ?? 0) >= 6).map((x) => `| ${x.id} | ${x.focus} | ${x.motivation} | ${x.selfReported} | ${x.longestRun ?? "–"} | ${x.midShare === undefined ? "–" : p(x.midShare)} |`),
    "",
    "### 마음이 불편했던 문항",
    ...(ux.emotional.length ? ux.emotional.map((e) => `- ${e.id}${e.hardPeriod ? ` (힘든 시기: ${e.hardPeriod})` : ""}: ${e.note}`) : ["- 없음"]),
    "",
    "### 한 줄 소감",
    ...ux.comments.map((c) => `- ${c.id}: ${c.comment}`),
  ].join("\n") : "- 응답 경험 기록 없음",
  "",
  "## 10. 납득도",
  "",
  acceptance ? [
    `- 리포트를 읽은 페르소나 ${acceptance.n}명 · "나 같다" 평균 ${acceptance.overallFit.toFixed(2)}/5 · 신뢰 ${acceptance.trust.toFixed(2)}/5 · 이해받았다고 느낌 ${p(acceptance.feltUnderstood)} · 끝까지 읽음 ${p(acceptance.readAll)} · 읽기 부담 ${acceptance.readingBurden.toFixed(2)}/5`,
    `- 공유 의향: ${dist(acceptance.wouldShare, acceptance.n)}`,
    `- 정확도(합성 ≥ 0.6) × 납득(≥ 4): ${dist(acceptance.quadrants, acceptance.n)}`,
    "",
    "### 섹션별: 맞다고 느낀 비율 vs 서술상 실제로 맞는 비율 (느낌 낮은 순)",
    "",
    "| 섹션 | n | 느낌 '맞다' | 실제 '맞다' |", "|---|---:|---:|---:|",
    ...acceptance.sections.map((s) => `| ${s.title.replace(/\|/g, "\\|")} | ${s.n} | ${p(s.felt)} | ${p(s.fits)} |`),
    "",
    "### 느낌(행) × 실제(열), 섹션 단위",
    "",
    "| 느낌＼실제 | 맞다 | 애매 | 아니다 |", "|---|---:|---:|---:|",
    ...Object.entries(acceptance.feltVsFits).map(([f, row]) => `| ${f} | ${row["맞다"]} | ${row["애매"]} | ${row["아니다"]} |`),
    "",
    "### 자기인식 차이별",
    "",
    "| 차이 | n | 납득 평균 | 거부 문장 수 | 그중 맹점 |", "|---|---:|---:|---:|---:|",
    ...Object.entries(acceptance.byGap).map(([lv, x]) => `| ${lv} | ${x.n} | ${x.fit.toFixed(2)} | ${x.rejected.toFixed(1)} | ${x.blindSpotRejections.toFixed(1)} |`),
    "",
    "### 페르소나별",
    "",
    "| id | 정확도 합성 | 납득 | 신뢰 | 사분면 | 자기인식 차이 | 읽은 범위 | 소감 |", "|---|---:|---:|---:|---|---|---|---|",
    ...acceptance.perPersona.map((x) => `| ${x.id} | ${x.accuracy.toFixed(2)} | ${x.fit} | ${x.trust} | ${x.quadrant} | ${x.gap ?? "–"} | ${x.readUntil} | ${x.comment.replace(/\|/g, "\\|")} |`),
    "",
    "### 정서적 안전성 — 불편하다고 지목된 문장",
    ...(acceptance.uncomfortable.length ? acceptance.uncomfortable.map((u) => `- ${u.id}${u.hardPeriod ? ` (힘든 시기: ${u.hardPeriod})` : ""}: “${u.sentence}” — ${u.why}`) : ["- 없음"]),
    "",
    "### 힘든 시기 페르소나",
    ...acceptance.hardPeriod.map((h) => `- ${h.id} (${h.period}): 납득 ${h.fit}/5 · 불편 문장 ${h.uncomfortable}개 · ${h.comment}`),
    "",
    "### 이해하기 어려웠던 용어",
    ...acceptance.confusingTerms.map((t) => `- (${t.count}) ${t.term}`),
    "",
    "### 맹점 때문에 거부된 문장 (서술상 맞음)",
    ...acceptance.blindSpotRejections.map((r) => `- ${r.id}: “${r.sentence}” — ${r.why}`),
    "",
    "### 그 밖에 거부된 문장",
    ...acceptance.rejected.map((r) => `- ${r.id}: “${r.sentence}” — ${r.why}`),
  ].join("\n") : "- 납득도 기록 없음",
  "",
  "## 11. 골라내기 테스트",
  "",
  judge ? [
    `- 시행 ${judge.n}개 · 적중 ${judge.hit} (${p(judge.hitRate)}, 우연 ${p(judge.chance)}) · 2순위 안 ${p(judge.top2Rate)} · 같은 Core 오답을 고른 비율 ${p(judge.sameCoreDistractorChosen)}`,
    `- 확신도별: ${Object.entries(judge.byConfidence).map(([c, x]) => `${c}점 ${x.n}건 적중 ${p(x.hitRate)}`).join(" · ")}`,
    "",
    "### 오답 시행",
    ...judge.misses.map((m) => `- ${m.trial}: 정답 ${m.persona} → ${m.chose} 선택. ${m.reason}`),
    "",
    "### 평가자가 '누구에게나 맞는다'고 지목한 문장 (빈도순)",
    ...judge.generic.map((g) => `- (${g.count}) ${g.sentence}`),
  ].join("\n") : "- 판정 없음",
];
writeText(vpath("analysis", "metrics.md"), `${md.join("\n")}\n`);

// ── dashboard.html ───────────────────────────────────────────────
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[c]!);
const bars = (title: string, rows: { label: string; value: number; ref?: number }[], fmt = (v: number) => p(v)) => `
<figure class="card"><figcaption>${esc(title)}</figcaption><ul class="bars">${rows.map((r) => `
<li><span class="lab">${esc(r.label)}</span><span class="track"><span class="fill" style="width:${Math.max(0, Math.min(100, r.value * 100)).toFixed(1)}%"></span>${r.ref !== undefined ? `<span class="ref" style="left:${Math.min(100, r.ref * 100).toFixed(1)}%" title="기준 ${fmt(r.ref)}"></span>` : ""}</span><span class="num">${fmt(r.value)}${r.ref !== undefined ? ` <small>기준 ${fmt(r.ref)}</small>` : ""}</span></li>`).join("")}</ul></figure>`;
const share = (d: Record<string, number>, n: number) => (k: string) => (d[k] ?? 0) / (n || 1);
const N = records.length;
const A = metrics.accuracy.normal;
const kpis: [string, string, string][] = [
  ["Core Top1 (일반 응답)", p(A.coreTop1), `Top2 ${p(A.coreTop2)}`],
  ["골라내기 적중", judge ? p(judge.hitRate) : "–", "우연 25%"],
  ["Primary 재현 (run1↔2)", stability ? p(stability.primary) : "–", stability ? `문항 ±1 ${p(stability.likertWithin1)}` : ""],
  ["다른 사람 리포트 유사도", similarity ? similarity.crossPersona.mean.toFixed(2) : "–", similarity ? `같은 사람 ${similarity.samePersona.mean.toFixed(2)}` : ""],
  ["납득도 (나 같다)", acceptance ? `${acceptance.overallFit.toFixed(1)}/5` : "–", acceptance ? `이해받음 ${p(acceptance.feltUnderstood)}` : ""],
  ["응답 경험", ux ? `${ux.overall.minutes.p50}분` : "–", ux ? `지루함 ${ux.overall.boredom.toFixed(1)} · 어려움 ${ux.overall.difficulty.toFixed(1)}` : ""],
];
const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>결과 다양성 검증</title>
<style>
:root{--bg:#f7f7f5;--surface:#fff;--text:#1d1d1b;--muted:#6b6b66;--line:#e3e2dd;--accent:#3d6fb6;--ref:#c2553d;--chip:#eef2f8}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#151514;--surface:#1f1f1d;--text:#ecebe6;--muted:#a3a29b;--line:#34332f;--accent:#7ea6e0;--ref:#e48a73;--chip:#26303d}}
:root[data-theme="dark"]{--bg:#151514;--surface:#1f1f1d;--text:#ecebe6;--muted:#a3a29b;--line:#34332f;--accent:#7ea6e0;--ref:#e48a73;--chip:#26303d}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.6 system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif}
main{max-width:1080px;margin:0 auto;padding:24px 16px 64px}h1{font-size:1.5rem;margin:0 0 4px}h2{font-size:1.15rem;margin:40px 0 12px}p.sub{color:var(--muted);margin:0 0 20px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.kpi{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px}
.kpi b{display:block;font-size:1.6rem;font-variant-numeric:tabular-nums}.kpi span,.kpi small{color:var(--muted);font-size:.85rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:14px;margin:0}
figcaption{font-weight:600;margin-bottom:8px}.bars{list-style:none;margin:0;padding:0}.bars li{display:grid;grid-template-columns:7.5em 1fr 7.5em;gap:8px;align-items:center;font-size:.85rem;margin:3px 0}
.track{position:relative;height:10px;background:var(--chip);border-radius:5px}.fill{position:absolute;inset:0 auto 0 0;background:var(--accent);border-radius:5px}.ref{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ref)}
.num{text-align:right;font-variant-numeric:tabular-nums}.num small{color:var(--muted)}
.tbl{overflow-x:auto;background:var(--surface);border:1px solid var(--line);border-radius:12px}table{border-collapse:collapse;width:100%;font-size:.85rem}th,td{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}th:first-child,td:first-child{text-align:left}td.txt{text-align:left;white-space:normal}
.legend{color:var(--muted);font-size:.8rem;margin:6px 0 0}.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--accent);margin:0 4px 0 0}.legend i.r{background:var(--ref);width:3px}
</style></head><body><main>
<h1>SELF-LAYERS 결과 다양성 검증</h1>
<p class="sub">엔진 ${esc(SCORING_VERSION)} · 가상 페르소나 ${ids.length}명 × 응답 ${N}건 · 이상 신호를 찾는 스모크 테스트이며 통계적 판정이 아닙니다.</p>
<section class="kpis">${kpis.map(([t, v, s]) => `<div class="kpi"><span>${esc(t)}</span><b>${esc(v)}</b><small>${esc(s)}</small></div>`).join("")}</section>

<h2>정확도 — 의도한 인물을 얼마나 표현했나</h2>
<div class="grid">
${bars("일반 응답 페르소나", [
  { label: "Core Top1", value: A.coreTop1 }, { label: "Core Top2", value: A.coreTop2 }, { label: "ANX 구간", value: A.anx }, { label: "AVO 구간", value: A.avo },
  { label: "Schema Top3", value: A.schemaOverlap }, { label: "Value Top3", value: A.valueOverlap }, { label: "STATE", value: A.state }, { label: "반응성", value: A.reactivity },
  { label: "취약 트리거", value: A.vulnerable }, { label: "대처", value: A.coping }, { label: "채널", value: A.channel },
])}
${bars("의도 Core별 Top1 적중 (일반 응답)", CORE_TYPES.map((c) => ({ label: coreName(c), value: byCore[c].coreTop1 })))}
</div>
<div class="tbl" style="margin-top:12px"><table><thead><tr><th>플래그</th><th>의도O·결과O</th><th>의도O·결과X</th><th>의도X·결과O</th><th>재현율</th><th>정밀도</th></tr></thead><tbody>
${FLAGS.map((f) => { const x = flagTable[f]; return `<tr><td>${f}</td><td>${x.tp}</td><td>${x.fn}</td><td>${x.fp}</td><td>${p(x.recall)}</td><td>${p(x.precision)}</td></tr>`; }).join("")}
</tbody></table></div>

<h2>편향 — 결과가 한쪽으로 쏠리나</h2>
<p class="legend"><i></i>결과 비율 <i class="r"></i>의도한 비율</p>
<div class="grid">
${bars("Primary Core", CORE_TYPES.map((c) => ({ label: coreName(c), value: share(observed.primary, N)(c), ref: share(intended.primary, N)(c) })))}
${bars("Value Top1", VALUE_CODES.map((v) => ({ label: VALUES[v].name, value: share(observed.valueTop1, N)(v), ref: share(intended.valueTop1, N)(v) })))}
${bars("Schema Top1", SCHEMA_CODES.map((s) => ({ label: SCHEMAS[s].name.slice(0, 9), value: share(observed.schemaTop1, N)(s), ref: share(intended.schemaTop1, N)(s) })))}
${bars("STATE", ["expansion", "balanced", "protection"].map((s) => ({ label: s, value: share(observed.state, N)(s), ref: share(intended.state, N)(s) })))}
</div>
<h2>Core 혼동행렬 (일반 응답, 행=의도 · 열=결과)</h2>
<div class="tbl"><table><thead><tr><th>의도＼결과</th>${CORE_TYPES.map((c) => `<th>${coreName(c)}</th>`).join("")}</tr></thead><tbody>
${CORE_TYPES.map((tr) => `<tr><td>${coreName(tr)}</td>${CORE_TYPES.map((rs) => `<td${tr === rs ? " style=\"font-weight:700\"" : ""}>${confusion[tr][rs] || "·"}</td>`).join("")}</tr>`).join("")}
</tbody></table></div>

<h2>리포트 바넘 후보</h2>
<div class="tbl"><table><thead><tr><th>리포트 비율</th><th style="text-align:left">문장 (숫자는 #)</th></tr></thead><tbody>
${(similarity?.barnum ?? []).slice(0, 25).map((b) => `<tr><td>${p(b.share)}</td><td class="txt">${esc(b.sentence)}</td></tr>`).join("")}
</tbody></table></div>
${ux ? `<h2>응답 경험 — 어렵거나 지루하지 않았나</h2><div class="grid">
${bars("Part별 지루함 (1–5)", ux.parts.map((x) => ({ label: `Part ${x.part}`, value: x.boredom / 5 })), (v) => (v * 5).toFixed(2))}
${bars("Part별 어려움 (1–5)", ux.parts.map((x) => ({ label: `Part ${x.part}`, value: x.difficulty / 5 })), (v) => (v * 5).toFixed(2))}
${bars("실제라면 끝까지", (["yes", "maybe", "no"] as const).map((k) => ({ label: k, value: (ux.overall.wouldFinish[k] ?? 0) / ux.n })))}
</div>
<div class="tbl" style="margin-top:12px"><table><thead><tr><th>화면</th><th>지목</th><th style="text-align:left">문항</th><th style="text-align:left">이유</th></tr></thead><tbody>
${ux.hardItems.slice(0, 12).map((h) => `<tr><td>${h.q}</td><td>${h.count}</td><td class="txt">${esc(h.text)}</td><td class="txt">${esc(Object.entries(h.reasons).map(([k, v]) => `${k} ${v}`).join(", "))}</td></tr>`).join("")}
</tbody></table></div>` : ""}
${acceptance ? `<h2>납득도 — 읽고 "맞다"고 느끼나</h2><div class="grid">
${bars("정확도 × 납득 (페르소나 수)", Object.entries(acceptance.quadrants).map(([k, v]) => ({ label: k.replace(/\(.*\)/, ""), value: v / acceptance.n })), (v) => `${Math.round(v * acceptance.n)}명`)}
${bars("섹션별 '맞다' 느낌 (낮은 순)", acceptance.sections.slice(0, 10).map((s) => ({ label: s.title.slice(0, 9), value: s.felt, ref: s.fits })))}
${bars("자기인식 차이별 납득 (1–5)", Object.entries(acceptance.byGap).map(([lv, x]) => ({ label: lv, value: (Number.isNaN(x.fit) ? 0 : x.fit) / 5 })), (v) => (v * 5).toFixed(2))}
</div><p class="legend"><i></i>느낌 '맞다' <i class="r"></i>서술상 실제 '맞다'</p>` : ""}
${judge ? `<h2>골라내기 테스트</h2><div class="grid">${bars("판정 결과", [{ label: "적중", value: judge.hitRate, ref: judge.chance }, { label: "2순위 안", value: judge.top2Rate }, { label: "같은 Core 오답", value: judge.sameCoreDistractorChosen }])}</div>` : ""}
<p class="legend" style="margin-top:32px">자세한 표: validation/analysis/metrics.md · 원자료: metrics.json</p>
</main></body></html>
`;
writeText(vpath("analysis", "dashboard.html"), html);
console.log(md.slice(0, 12).join("\n"));
