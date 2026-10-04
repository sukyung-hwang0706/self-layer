// 엔진 결과 묶음의 분포 요약. 몬테카를로(Step 2)와 페르소나 분석(Step 6)이 함께 쓴다.
import { CORE_TYPES, SCHEMA_CODES, VALUE_CODES, type AssessmentResult, type CoreType } from "../../src/types/assessment";

export type Dist = Record<string, number>;

export function countBy<T>(rows: readonly T[], key: (row: T) => string | null | undefined, keys: readonly string[] = []): Dist {
  const out: Dist = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const row of rows) {
    const k = key(row) ?? "(없음)";
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export const share = (dist: Dist, total: number): Dist =>
  Object.fromEntries(Object.entries(dist).map(([k, v]) => [k, total ? v / total : 0]));

export function quantiles(values: readonly number[]) {
  if (values.length === 0) return { min: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, max: 0, mean: 0 };
  const s = [...values].sort((a, b) => a - b);
  const q = (p: number) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
  return { min: s[0], p10: q(0.1), p25: q(0.25), p50: q(0.5), p75: q(0.75), p90: q(0.9), max: s[s.length - 1], mean: s.reduce((a, b) => a + b, 0) / s.length };
}

/** 정규화 엔트로피(0=한 범주에 몰림, 1=완전 균등). 분포 쏠림의 단일 지표. */
export function evenness(dist: Dist, categories: number) {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (!total || categories < 2) return 0;
  let h = 0;
  for (const v of Object.values(dist)) if (v > 0) h -= (v / total) * Math.log(v / total);
  return h / Math.log(categories);
}

const confidenceBand = (c: number) => (c >= 70 ? "≥70" : c >= 55 ? "55–69" : "<55");

function rateBy(rows: readonly AssessmentResult[], hit: (r: AssessmentResult) => boolean) {
  const out: Record<string, { n: number; rate: number }> = {};
  for (const t of CORE_TYPES) {
    const group = rows.filter((r) => r.core.primary === t);
    out[t] = { n: group.length, rate: group.length ? group.filter(hit).length / group.length : 0 };
  }
  return out;
}

export function summarize(rows: readonly AssessmentResult[]) {
  const n = rows.length;
  const primary = countBy(rows, (r) => r.core.primary, CORE_TYPES);
  // 가치 1위는 공동 1위를 나눠 센다(보정 순위, v1.2-app.2부터)
  const valueTop1 = Object.fromEntries(VALUE_CODES.map((v) => [v, rows.reduce((s, r) => s + (r.values.first.includes(v) ? 1 / r.values.first.length : 0), 0)])) as Dist;
  const schemaTop1 = countBy(rows, (r) => r.schemaRanking[0], SCHEMA_CODES);
  const valueTop3: Dist = Object.fromEntries(VALUE_CODES.map((v) => [v, rows.filter((r) => r.values.top3.includes(v)).length / (n || 1)]));
  const schemaTop3: Dist = Object.fromEntries(SCHEMA_CODES.map((s) => [s, rows.filter((r) => r.schemaRanking.slice(0, 3).includes(s)).length / (n || 1)]));
  return {
    n,
    core: {
      primary: share(primary, n),
      primaryEvenness: evenness(primary, CORE_TYPES.length),
      undetermined: rows.filter((r) => r.core.status === "undetermined").length / (n || 1),
      strongSecondary: rows.filter((r) => r.core.strongSecondary).length / (n || 1),
      weakMotive: rows.filter((r) => r.core.weakMotive).length / (n || 1),
      noInfluence: rows.filter((r) => r.core.influence.type === null).length / (n || 1),
      confidence: quantiles(rows.map((r) => r.core.confidence)),
      confidenceBand: share(countBy(rows, (r) => confidenceBand(r.core.confidence), ["≥70", "55–69", "<55"]), n),
      separation: quantiles(rows.map((r) => r.core.separation)),
      channel: share(countBy(rows, (r) => r.core.channel.primary, ["SP", "SO", "SX"]), n),
    },
    values: { top1: share(valueTop1, n), top1Evenness: evenness(valueTop1, VALUE_CODES.length), inTop3: valueTop3 },
    schemas: { top1: share(schemaTop1, n), top1Evenness: evenness(schemaTop1, SCHEMA_CODES.length), inTop3: schemaTop3 },
    attachment: { ANX: quantiles(rows.map((r) => r.attachment.ANX)), AVO: quantiles(rows.map((r) => r.attachment.AVO)) },
    state: share(countBy(rows, (r) => r.state.band, ["expansion", "balanced", "protection"]), n),
    stress: {
      vulnerableCount: share(countBy(rows, (r) => String(r.stress.vulnerable.length), ["0", "1", "2", "3", "4", "5", "6"]), n),
      reactivityBand: share(countBy(rows, (r) => r.stress.reactivityBand, ["high", "mid", "low"]), n),
      coreMatch: rows.filter((r) => r.stress.coreMatch === true).length / (n || 1),
    },
    modes: {
      expansionBand: share(countBy(rows, (r) => r.modes.expansionBand, ["high", "mid", "low"]), n),
      protectionBand: share(countBy(rows, (r) => r.modes.protectionBand, ["high", "mid", "low"]), n),
    },
    growthExperiments: share(countBy(rows, (r) => String(r.growth.experiments), ["0", "2", "3"]), n),
    message: {
      rank1: share(countBy(rows, (r) => r.message.rank1, CORE_TYPES), n),
      matchesPrimary: rows.filter((r) => r.message.rank1 === r.core.primary).length / (n || 1),
      showsRank2: rows.filter((r) => r.message.rank2 !== null).length / (n || 1),
    },
    insights: {
      anyReinforcement: rows.filter((r) => r.insights.reinforcements.length > 0).length / (n || 1),
      counterevidence: rows.filter((r) => r.insights.counterevidence !== null).length / (n || 1),
      reinforcementByPrimary: rateBy(rows, (r) => r.insights.reinforcements.some((x) => x.coreRole === "primary")),
      counterevidenceByPrimary: rateBy(rows, (r) => r.insights.counterevidence !== null),
    },
    consistencyFlag: rows.filter((r) => r.consistency.flag).length / (n || 1),
  };
}

export type Summary = ReturnType<typeof summarize>;
export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
export const topEntries = (d: Dist, k = 3) => Object.entries(d).sort((a, b) => b[1] - a[1]).slice(0, k);
export const CORE_LIST: readonly CoreType[] = CORE_TYPES;
