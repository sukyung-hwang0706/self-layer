import { DISPLAY_ORDER, ITEM_BY_ID, PART1, PART2, PART3, PART4, PART5, PART6 } from "../data/items";
import {
  ATTACHMENT_CODES, CHANNELS, COPING_CODES, CORE_TYPES, SCHEMA_CODES, TRIGGER_CODES, VALUE_CODES,
  type Answer, type Answers, type AssessmentResult, type AttachmentCode, type Channel, type ChoiceAnswer, type CopingCode,
  type CoreType, type Counterevidence, type Level3, type LikertCode, type LikertItem, type LikertValue, type OptionKey,
  type RankAnswer, type Reinforcement, type SchemaCode, type Scores, type StateBand, type TriggerCode, type ValueCode,
} from "../types/assessment";

/** 채점 규칙 버전. 계산식·임계값이 바뀌면 올린다. */
export const SCORING_VERSION = "v1.0-app.1";

// ── 설계서 2장·7장 매핑 ────────────────────────────────────────────
export const GROWTH_DIRECTION: Readonly<Record<CoreType, CoreType>> = { T1: "T7", T2: "T4", T3: "T6", T4: "T1", T5: "T8", T6: "T9", T7: "T5", T8: "T2", T9: "T3" };
export const STRESS_DIRECTION: Readonly<Record<CoreType, CoreType>> = { T1: "T4", T2: "T8", T3: "T9", T4: "T2", T5: "T7", T6: "T3", T7: "T1", T8: "T5", T9: "T6" };
/** SC[stress(Core)]: 7장 대처 표의 "스트레스 방향에서 기대되는 Core" 매핑 */
export const PROTECTION_COPING: Readonly<Record<CoreType, CopingCode>> = { T1: "SC2", T2: "SC4", T3: "SC5", T4: "SC3", T5: "SC5", T6: "SC1", T7: "SC6", T8: "SC2", T9: "SC3" };
export const TRIGGER_CORES: Readonly<Record<TriggerCode, readonly CoreType[]>> = { ST1: ["T1", "T3"], ST2: ["T2", "T4"], ST3: ["T5", "T6"], ST4: ["T7", "T8"], ST5: ["T9"], ST6: ["T2", "T6", "T9"] };

/** 10.8 Resonance(n) 변수. 교차 규칙(강화)에서도 같은 연결을 사용한다. */
export type LinkedKey = SchemaCode | "AVO" | "ANX+ABN" | "ST4" | "ST5";
export const RESONANCE: Readonly<Record<CoreType, LinkedKey>> = { T1: "US", T2: "SS", T3: "AS", T4: "DEF", T5: "AVO", T6: "ANX+ABN", T7: "ST4", T8: "MIS", T9: "ST5" };

/** 앱 임시 규칙: 유형별 "전형적 설명"을 뒷받침하는 변수. 평균이 낮으면 반증으로 쓴다. */
export const TYPICAL_SIGNALS: Readonly<Record<CoreType, readonly (SchemaCode | AttachmentCode | TriggerCode)[]>> = {
  T1: ["US"], T2: ["SS"], T3: ["AS"], T4: ["DEF", "ED"], T5: ["AVO"], T6: ["ANX", "ABN", "MIS"], T7: ["ST4"], T8: ["MIS"], T9: ["SS", "ST5"],
};

// ── 임계값 (설계서 기준, 파일럿 전 가설값) ─────────────────────────
const VULNERABLE_TRIGGER = 65;
const MESSAGE_PAIR_GAP = 8;
const STRONG_SECONDARY_MOTIVE = 75;
const STRONG_SECONDARY_GAP = 8;
const WEAK_MOTIVE = 40;
const CONSISTENCY_PENALTY = 5;
const INCONSISTENT_PAIR_DIFF = 4;
const INCONSISTENT_SCHEMA_COUNT = 4;
// 앱 임시 규칙
const REINFORCE_CORE_MIN = 50;
const REINFORCE_LINKED_MIN = 60;
const REINFORCE_STRENGTH_MIN = 55;
const COUNTEREVIDENCE_MAX = 45;

export class IncompleteAnswersError extends Error {
  constructor(public readonly missing: string[]) { super(`${missing.length}개 문항에 응답이 없습니다.`); }
}

// ── 응답 검증 ─────────────────────────────────────────────────────
const OPTION_KEYS: readonly OptionKey[] = ["A", "B", "C"];
const isOptionKey = (v: unknown): v is OptionKey => typeof v === "string" && (OPTION_KEYS as readonly string[]).includes(v);

export function isValidAnswer(itemId: string, value: unknown): value is Answer {
  const item = ITEM_BY_ID.get(itemId);
  if (!item || value === null || value === undefined) return false;
  if (item.kind === "likert") return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5;
  if (item.kind === "choice") {
    const v = value as Partial<ChoiceAnswer>;
    return typeof value === "object" && !Array.isArray(value) && isOptionKey(v.first) && isOptionKey(v.second) && v.first !== v.second;
  }
  return Array.isArray(value) && value.length === 3 && value.every(isOptionKey) && new Set(value).size === 3;
}

export function missingItems(answers: Answers): string[] {
  return DISPLAY_ORDER.filter((id) => !Object.hasOwn(answers, id) || !isValidAnswer(id, answers[id]));
}

// ── 계산 도우미 ───────────────────────────────────────────────────
const mean = (values: readonly number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const to100 = (m: number) => (m - 1) / 4 * 100;
const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const level = (v: number, high: number, mid: number): Level3 => (v >= high ? "high" : v >= mid ? "mid" : "low");
const fill = <K extends string>(keys: readonly K[], value = 0) => Object.fromEntries(keys.map((k) => [k, value])) as Scores<K>;

/** 점수 내림차순, 동점은 코드의 정의 순서. */
export function rankBy<K extends string>(keys: readonly K[], score: Scores<K>): K[] {
  return [...keys].sort((a, b) => score[b] - score[a] || keys.indexOf(a) - keys.indexOf(b));
}

function likertScore(items: readonly LikertItem[], code: LikertCode, answers: Answers) {
  const scored = items.filter((i) => i.code === code).map((i) => {
    const v = answers[i.id] as LikertValue;
    return i.reverse ? 6 - v : v;
  });
  return to100(mean(scored));
}

// ── 메인 ──────────────────────────────────────────────────────────
export function scoreAssessment(answers: Answers): AssessmentResult {
  const missing = missingItems(answers);
  if (missing.length) throw new IncompleteAnswersError(missing);

  // 10.3 관계·패턴 (Core 신뢰도 페널티에 일관성 플래그가 필요하므로 먼저 계산)
  const attachment = Object.fromEntries(ATTACHMENT_CODES.map((c) => [c, likertScore(PART3, c, answers)])) as Scores<AttachmentCode>;
  const schemas = Object.fromEntries(SCHEMA_CODES.map((c) => [c, likertScore(PART3, c, answers)])) as Scores<SchemaCode>;
  const inconsistentSchemas = SCHEMA_CODES.filter((code) => {
    const [pos, rev] = [PART3.find((i) => i.code === code && !i.reverse)!, PART3.find((i) => i.code === code && i.reverse)!];
    return Math.abs((answers[pos.id] as number) - (6 - (answers[rev.id] as number))) >= INCONSISTENT_PAIR_DIFF;
  });
  const consistencyFlag = inconsistentSchemas.length >= INCONSISTENT_SCHEMA_COUNT;
  const penalty = consistencyFlag ? CONSISTENCY_PENALTY : 0;

  // 10.2 Core
  const raw = fill(CORE_TYPES), firstPicks = fill(CORE_TYPES);
  const cappedValues = fill(VALUE_CODES), maxValues = fill(VALUE_CODES);
  const contextsHit = new Map<ValueCode, Set<string>>(), contextsAll = new Map<ValueCode, Set<string>>();
  for (const item of PART1) {
    const a = answers[item.id] as ChoiceAnswer;
    const points = new Map<OptionKey, number>([[a.first, 2], [a.second, 1]]);
    const valuePoints = new Map<ValueCode, number>();
    for (const opt of item.options) {
      const p = points.get(opt.key) ?? 0;
      raw[opt.type] += p;
      if (opt.key === a.first) firstPicks[opt.type] += 1;
      valuePoints.set(opt.value, (valuePoints.get(opt.value) ?? 0) + p);
      if (!contextsAll.has(opt.value)) contextsAll.set(opt.value, new Set());
      contextsAll.get(opt.value)!.add(item.context);
    }
    for (const [value, p] of valuePoints) {
      // 4장: 같은 문항 안에서 같은 Value의 득점은 최대 2점
      cappedValues[value] += Math.min(2, p);
      maxValues[value] += 2;
      if (p > 0) {
        if (!contextsHit.has(value)) contextsHit.set(value, new Set());
        contextsHit.get(value)!.add(item.context);
      }
    }
  }
  const typeScore = Object.fromEntries(CORE_TYPES.map((t) => [t, raw[t] / 12 * 100])) as Scores<CoreType>;
  const motive = Object.fromEntries(PART2.map((i) => [i.code, to100(answers[i.id] as number)])) as Scores<CoreType>;
  const coreKey = (t: CoreType) => [typeScore[t], motive[t], firstPicks[t]];
  const ranking = [...CORE_TYPES].sort((a, b) => {
    const [ka, kb] = [coreKey(a), coreKey(b)];
    for (let k = 0; k < ka.length; k++) if (kb[k] !== ka[k]) return kb[k] - ka[k];
    return CORE_TYPES.indexOf(a) - CORE_TYPES.indexOf(b);
  });
  const primary = ranking[0], secondary = ranking[1];
  const tiedWith = ranking.slice(1).filter((t) => coreKey(t).every((v, k) => v === coreKey(primary)[k]));
  const separation = Math.min(100, (raw[primary] - raw[secondary]) / 4 * 100);
  const confidence = clamp(0.5 * typeScore[primary] + 0.2 * separation + 0.3 * motive[primary] - penalty);
  const idx = CORE_TYPES.indexOf(primary);
  const wings: [CoreType, CoreType] = [CORE_TYPES[(idx + 8) % 9], CORE_TYPES[(idx + 1) % 9]];
  const influence = raw[wings[0]] === raw[wings[1]] ? null : raw[wings[0]] > raw[wings[1]] ? wings[0] : wings[1];

  const rankAnswer = answers[PART6[0].id] as RankAnswer;
  const channelScores = fill(CHANNELS);
  rankAnswer.forEach((key, i) => { channelScores[PART6[0].options.find((o) => o.key === key)!.channel] = [100, 50, 0][i]; });
  const channelPrimary = PART6[0].options.find((o) => o.key === rankAnswer[0])!.channel as Channel;

  // 10.3 Value = ValueSelectionScore 60% + Context Diversity 40%
  const selection = fill(VALUE_CODES), diversity = fill(VALUE_CODES), hit = fill(VALUE_CODES), available = fill(VALUE_CODES), valueScore = fill(VALUE_CODES);
  for (const v of VALUE_CODES) {
    selection[v] = cappedValues[v] / maxValues[v] * 100;
    hit[v] = contextsHit.get(v)?.size ?? 0;
    available[v] = contextsAll.get(v)!.size;
    diversity[v] = hit[v] / available[v] * 100;
    valueScore[v] = 0.6 * selection[v] + 0.4 * diversity[v];
  }
  const valueRanking = rankBy(VALUE_CODES, valueScore);

  // 7장 Stress
  const triggers = Object.fromEntries(TRIGGER_CODES.map((c) => [c, likertScore(PART4, c, answers)])) as Scores<TriggerCode>;
  const coping = Object.fromEntries(COPING_CODES.map((c) => [c, likertScore(PART4, c, answers)])) as Scores<CopingCode>;
  const reactivity = likertScore(PART4, "SR", answers);
  const vulnerable = rankBy(TRIGGER_CODES, triggers).filter((c) => triggers[c] >= VULNERABLE_TRIGGER).slice(0, 2);
  const maxCoping = Math.max(...COPING_CODES.map((c) => coping[c]));
  const dominantCoping = COPING_CODES.filter((c) => coping[c] === maxCoping);
  const coreMatch = vulnerable.length ? vulnerable.some((c) => TRIGGER_CORES[c].includes(primary)) : null;

  // 10.4 STATE
  const selfCompassion = likertScore(PART5, "SC", answers), flexibility = likertScore(PART5, "FLX", answers);
  const needs = { autonomy: likertScore(PART5, "N-AUT", answers), competence: likertScore(PART5, "N-COM", answers), relatedness: likertScore(PART5, "N-REL", answers) };
  const stateIndex = 0.35 * selfCompassion + 0.35 * flexibility + 0.30 * mean([needs.autonomy, needs.competence, needs.relatedness]);
  const stateBand: StateBand = stateIndex >= 70 ? "expansion" : stateIndex >= 45 ? "balanced" : "protection";

  // 10.6 Expansion / Protection
  const maxTrigger = Math.max(...TRIGGER_CODES.map((c) => triggers[c]));
  const expansion = 0.55 * stateIndex + 0.25 * (100 - reactivity) + 0.20 * (100 - maxTrigger);
  const protectionCoping = PROTECTION_COPING[primary];
  const protection = 0.40 * coping[protectionCoping] + 0.35 * (100 - stateIndex) + 0.25 * reactivity;

  // 10.7 Growth 준비도
  const readiness = 0.40 * stateIndex + 0.35 * expansion + 0.25 * needs.relatedness;
  const growthBand = level(readiness, 65, 45);

  // 10.8 메시지
  const resonanceValue = (key: LinkedKey) => linkedScore(key, schemas, attachment, triggers);
  const messageScore = Object.fromEntries(CORE_TYPES.map((t) => [t, 0.6 * typeScore[t] + 0.4 * resonanceValue(RESONANCE[t])])) as Scores<CoreType>;
  const messageRanking = rankBy(CORE_TYPES, messageScore);
  const gap = messageScore[messageRanking[0]] - messageScore[messageRanking[1]];

  // 앱 임시 교차 규칙: 강화 · 반증
  const reinforcements: Reinforcement[] = [];
  for (const [core, coreRole] of [[primary, "primary"], [secondary, "secondary"]] as const) {
    const linked = RESONANCE[core], ls = resonanceValue(linked), strength = (typeScore[core] + ls) / 2;
    if (typeScore[core] >= REINFORCE_CORE_MIN && ls >= REINFORCE_LINKED_MIN && strength >= REINFORCE_STRENGTH_MIN) reinforcements.push({ core, coreRole, linked, linkedScore: ls, strength });
  }
  reinforcements.sort((a, b) => b.strength - a.strength);
  const typical = TYPICAL_SIGNALS[primary];
  const typicalScore = mean(typical.map((k) => linkedScore(k, schemas, attachment, triggers)));
  const counterevidence: Counterevidence | null = typicalScore < COUNTEREVIDENCE_MAX ? { core: primary, typical: [...typical], typicalScore } : null;

  return {
    version: SCORING_VERSION,
    core: {
      raw, typeScore, firstPicks, motive, ranking, primary,
      status: tiedWith.length ? "undetermined" : "determined", tiedWith, secondary,
      strongSecondary: motive[secondary] >= STRONG_SECONDARY_MOTIVE && typeScore[primary] - typeScore[secondary] <= STRONG_SECONDARY_GAP,
      separation, confidence, weakMotive: motive[primary] < WEAK_MOTIVE,
      influence: { type: influence, candidates: wings },
      channel: { scores: channelScores, primary: channelPrimary },
    },
    values: { capped: cappedValues, selection, contextsHit: hit, contextsAvailable: available, diversity, score: valueScore, ranking: valueRanking, top3: valueRanking.slice(0, 3) },
    attachment, schemas, schemaRanking: rankBy(SCHEMA_CODES, schemas),
    consistency: { inconsistentSchemas, flag: consistencyFlag },
    stress: { triggers, vulnerable, reactivity, reactivityBand: level(reactivity, 70, 40), coping, dominantCoping, coreMatch },
    state: { selfCompassion, flexibility, needs, index: stateIndex, band: stateBand },
    modes: {
      expansion, expansionBand: level(expansion, 70, 45), protection, protectionBand: level(protection, 70, 45),
      growthDirection: GROWTH_DIRECTION[primary], stressDirection: STRESS_DIRECTION[primary], protectionCoping,
    },
    growth: { readiness, band: growthBand, experiments: growthBand === "high" ? 3 : growthBand === "mid" ? 2 : 0 },
    message: {
      score: messageScore, ranking: messageRanking, rank1: messageRanking[0],
      rank2: gap <= MESSAGE_PAIR_GAP ? messageRanking[1] : null, gap, coreMatch: messageRanking[0] === primary,
    },
    insights: { reinforcements, counterevidence },
  };
}

export function linkedScore(key: string, schemas: Scores<SchemaCode>, attachment: Scores<AttachmentCode>, triggers: Scores<TriggerCode>): number {
  if (key === "ANX+ABN") return (attachment.ANX + schemas.ABN) / 2;
  if (key in schemas) return schemas[key as SchemaCode];
  if (key in attachment) return attachment[key as AttachmentCode];
  if (key in triggers) return triggers[key as TriggerCode];
  throw new Error(`알 수 없는 연결 변수: ${key}`);
}
