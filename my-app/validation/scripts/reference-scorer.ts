/**
 * 설계서만 보고 만든 독립 구현(검증용), 앱 엔진 아님.
 *
 * 기준: validation/spec/design-v1.txt (SELF-LAYERS V1.0 검사 설계서) 4~10장.
 * 앱의 src/lib/ 채점 코드와 docs/scoring-decisions.md는 참고하지 않았다.
 * 설계서에 식이 있는 항목만 계산한다. 근거·가정·미정의 목록은 validation/reference-notes.md.
 * 모든 점수는 0–100이며 중간값은 반올림하지 않는다.
 */
import { ITEM_BY_ID as ITEM_BY_ID_REF, PART1, PART2, PART3, PART4, PART5, PART6 } from "../../src/data/items";
import {
  ATTACHMENT_CODES,
  CHANNELS,
  COPING_CODES,
  CORE_TYPES,
  SCHEMA_CODES,
  TRIGGER_CODES,
  VALUE_CODES,
  type Answer,
  type Answers,
  type AssessmentResult,
  type AttachmentCode,
  type Channel,
  type ChoiceAnswer,
  type CopingCode,
  type CoreResult,
  type CoreType,
  type LikertCode,
  type LikertItem,
  type Level3,
  type MessageResult,
  type ModesResult,
  type OptionKey,
  type RankAnswer,
  type SchemaCode,
  type Scores,
  type StateBand,
  type StateResult,
  type StressResult,
  type TriggerCode,
  type ValueCode,
  type ValueResult,
} from "../../src/types/assessment";

/** 설계서에 식이 없는 influence(Wing, V0.2)는 제외한 Core 결과. */
export type ReferenceCore = Omit<CoreResult, "influence">;

/**
 * AssessmentResult의 부분 객체. 계산하지 않은 필드(version, values.score/top3 등, schemaRanking,
 * insights, core.influence)는 아예 넣지 않는다.
 */
export interface ReferenceResult {
  core: ReferenceCore;
  /** 4장 "문항당 같은 Value 최대 2점" 제한을 적용한 원점수만. ValueScore(60/40)는 식이 없어 제외. */
  values: Pick<ValueResult, "capped">;
  attachment: AssessmentResult["attachment"];
  schemas: AssessmentResult["schemas"];
  consistency: AssessmentResult["consistency"];
  stress: StressResult;
  state: StateResult;
  modes: ModesResult;
  growth: AssessmentResult["growth"];
  message: MessageResult;
}

// ---------- 설계서 표 ----------

/** 2장 통합·분열 방향 표. */
const EXPANSION_DIRECTION: Record<CoreType, CoreType> = { T1: "T7", T2: "T4", T3: "T6", T4: "T1", T5: "T8", T6: "T9", T7: "T5", T8: "T2", T9: "T3" };
const STRESS_DIRECTION: Record<CoreType, CoreType> = { T1: "T4", T2: "T8", T3: "T9", T4: "T2", T5: "T7", T6: "T3", T7: "T1", T8: "T5", T9: "T6" };

/** 7장 대처 표의 "스트레스 방향에서 기대되는 Core" 열 (출발 Core → 대처). */
const STRESS_COPING: Record<CoreType, CopingCode> = {
  T6: "SC1", // T6→T3
  T1: "SC2", T8: "SC2", // T1→T4, T8→T5
  T4: "SC3", T9: "SC3", // T4→T2, T9→T6
  T2: "SC4", // T2→T8
  T5: "SC5", T3: "SC5", // T5→T7, T3→T9
  T7: "SC6", // T7→T1
};

/** 7장 트리거 표의 "연결 Core" 열. */
const TRIGGER_CORES: Record<TriggerCode, readonly CoreType[]> = {
  ST1: ["T1", "T3"],
  ST2: ["T2", "T4"],
  ST3: ["T5", "T6"],
  ST4: ["T7", "T8"],
  ST5: ["T9"],
  ST6: ["T2", "T6", "T9"],
};

// ---------- 기초 채점 (10.1) ----------

const score100 = (mean: number) => ((mean - 1) / 4) * 100;
const mean = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const zeros = <K extends string>(keys: readonly K[]): Scores<K> =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Scores<K>;

function likertValue(answers: Answers, id: string): number {
  const v: Answer | undefined = answers[id];
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) {
    throw new Error(`referenceScore: ${id} 응답이 없거나 1~5 정수가 아니다`);
  }
  return v;
}

/** scored = 6 − response (역문항) / response. */
const scored = (answers: Answers, item: LikertItem) => {
  const v = likertValue(answers, item.id);
  return item.reverse ? 6 - v : v;
};

const LIKERT_ITEMS: readonly LikertItem[] = [...PART2, ...PART3, ...PART4, ...PART5];

/** 코드별 역채점 평균 → 0–100. */
function codeScore(answers: Answers, code: LikertCode): number {
  const items = LIKERT_ITEMS.filter((i) => i.code === code);
  if (items.length === 0) throw new Error(`referenceScore: ${code} 문항이 없다`);
  return score100(mean(items.map((i) => scored(answers, i))));
}

function choiceAnswer(answers: Answers, id: string): ChoiceAnswer {
  const a = answers[id];
  // V1.1-app: 허용 키는 문항의 선택지(A~D)에서 읽는다.
  const keys: readonly OptionKey[] = (ITEM_BY_ID_REF.get(id) as { options?: readonly { key: OptionKey }[] } | undefined)?.options?.map((o) => o.key) ?? ["A", "B", "C"];
  if (typeof a !== "object" || a === null || Array.isArray(a)) throw new Error(`referenceScore: ${id} 1·2순위 응답이 없다`);
  const c = a as ChoiceAnswer;
  if (!keys.includes(c.first) || !keys.includes(c.second) || c.first === c.second) {
    throw new Error(`referenceScore: ${id} 1·2순위가 올바르지 않다`);
  }
  return c;
}

function rankAnswer(answers: Answers, id: string): RankAnswer {
  const a = answers[id];
  if (!Array.isArray(a) || a.length !== 3 || new Set(a).size !== 3 || !a.every((k) => k === "A" || k === "B" || k === "C")) {
    throw new Error(`referenceScore: ${id} 순위 응답이 올바르지 않다`);
  }
  return a as unknown as RankAnswer;
}

// ---------- 밴드 ----------

/** 10.4 STATE 밴드: 70–100 / 45–69 / 0–44. 정수 사이 구간은 하한 기준(≥70, ≥45)으로 본다(가정). */
const stateBand = (x: number): StateBand => (x >= 70 ? "expansion" : x >= 45 ? "balanced" : "protection");
/** 10.5 반응성: ≥70 높음 / 40–69 보통 / <40 낮음. */
const reactivityBand = (x: number): Level3 => (x >= 70 ? "high" : x >= 40 ? "mid" : "low");
/** 10.6 Expansion·Protection: ≥70 / 45–69 / <45. */
const modeBand = (x: number): Level3 => (x >= 70 ? "high" : x >= 45 ? "mid" : "low");
/** 10.7 Growth: ≥65 / 45–64 / <45. */
const growthBand = (x: number): Level3 => (x >= 65 ? "high" : x >= 45 ? "mid" : "low");

// ---------- 본체 ----------

export function referenceScore(answers: Answers): ReferenceResult {
  // ----- Part 1: Core raw / 1순위 횟수 / Value (4장) -----
  const raw = zeros(CORE_TYPES);
  const firstPicks = zeros(CORE_TYPES);
  const capped = zeros(VALUE_CODES);
  for (const item of PART1) {
    const ans = choiceAnswer(answers, item.id);
    const first = item.options.find((o) => o.key === ans.first)!;
    const second = item.options.find((o) => o.key === ans.second)!;
    raw[first.type] += 2;
    raw[second.type] += 1;
    firstPicks[first.type] += 1;
    // 4장 알려진 제약: 문항당 같은 Value 득점은 최대 2점.
    const perItem = new Map<ValueCode, number>();
    perItem.set(first.value, (perItem.get(first.value) ?? 0) + 2);
    perItem.set(second.value, (perItem.get(second.value) ?? 0) + 1);
    for (const [v, pts] of perItem) capped[v] += Math.min(2, pts);
  }

  // ----- Part 2: M(Tn) (5장) -----
  const motive = zeros(CORE_TYPES);
  for (const item of PART2) motive[item.code as CoreType] = score100(scored(answers, item));

  // ----- 10.2 Core 판정 -----
  const typeScore = zeros(CORE_TYPES);
  // 설계서 10.2의 12는 V1.0(유형당 6회 × 2점)의 최대값. V1.1-app은 같은 의미로 "도달 가능한 최대(2점 × 등장 횟수)"를 쓴다.
  for (const t of CORE_TYPES) typeScore[t] = (raw[t] / (2 * PART1.flatMap((i) => i.options).filter((o) => o.type === t).length)) * 100;

  // TypeScore → M → 1순위 횟수. 완전 동점은 T번호 순(AssessmentResult 타입 주석의 관례, 판정은 undetermined).
  const cmp = (a: CoreType, b: CoreType) =>
    typeScore[b] - typeScore[a] || motive[b] - motive[a] || firstPicks[b] - firstPicks[a];
  const ranking = [...CORE_TYPES].sort((a, b) => cmp(a, b) || CORE_TYPES.indexOf(a) - CORE_TYPES.indexOf(b));
  const primary = ranking[0];
  const secondary = ranking[1];
  const fullTie = ranking.filter((t) => cmp(primary, t) === 0);
  const status: CoreResult["status"] = fullTie.length > 1 ? "undetermined" : "determined";
  const tiedWith = status === "undetermined" ? fullTie : [];

  const separation = Math.min(100, ((raw[primary] - raw[secondary]) / 4) * 100);

  // ----- 6장 Part 3: 애착·스키마 + 응답 일관성 -----
  const attachment = zeros(ATTACHMENT_CODES);
  for (const c of ATTACHMENT_CODES) attachment[c as AttachmentCode] = codeScore(answers, c);
  const schemas = zeros(SCHEMA_CODES);
  for (const c of SCHEMA_CODES) schemas[c as SchemaCode] = codeScore(answers, c);

  const inconsistentSchemas = inconsistentSchemasByScoredGap(answers);
  const consistencyFlag = inconsistentSchemas.length >= 4;
  const penalty = consistencyFlag ? 5 : 0;

  const confidence = 0.5 * typeScore[primary] + 0.2 * separation + 0.3 * motive[primary] - penalty;
  const weakMotive = motive[primary] < 40;
  const strongSecondary = motive[secondary] >= 75 && typeScore[primary] - typeScore[secondary] <= 8;

  // ----- 9장 Part 6: 표현 채널 -----
  const ch = rankAnswer(answers, PART6[0].id);
  const channelScores = zeros(CHANNELS);
  const RANK_POINTS = [100, 50, 0] as const;
  ch.forEach((key, i) => {
    const opt = PART6[0].options.find((o) => o.key === key)!;
    channelScores[opt.channel as Channel] = RANK_POINTS[i];
  });
  const channelPrimary = PART6[0].options.find((o) => o.key === ch[0])!.channel;

  // ----- 7장 Part 4 / 10.5 Stress Signature -----
  const triggers = zeros(TRIGGER_CODES);
  for (const c of TRIGGER_CODES) triggers[c] = codeScore(answers, c);
  const coping = zeros(COPING_CODES);
  for (const c of COPING_CODES) coping[c] = codeScore(answers, c);
  const reactivity = codeScore(answers, "SR");

  // ≥65, 최대 2개, 내림차순. 동점 순서는 미정의 → ST 번호 순(가정).
  const vulnerable = TRIGGER_CODES.filter((c) => triggers[c] >= 65)
    .sort((a, b) => triggers[b] - triggers[a] || TRIGGER_CODES.indexOf(a) - TRIGGER_CODES.indexOf(b))
    .slice(0, 2);
  const maxCoping = Math.max(...COPING_CODES.map((c) => coping[c]));
  const dominantCoping = COPING_CODES.filter((c) => coping[c] === maxCoping);
  const coreMatch = vulnerable.length === 0 ? null : vulnerable.some((t) => TRIGGER_CORES[t].includes(primary));

  // ----- 8장 Part 5 / 10.4 STATE -----
  const selfCompassion = codeScore(answers, "SC");
  const flexibility = codeScore(answers, "FLX");
  const needs = {
    autonomy: codeScore(answers, "N-AUT"),
    competence: codeScore(answers, "N-COM"),
    relatedness: codeScore(answers, "N-REL"),
  };
  const stateIndex = 0.35 * selfCompassion + 0.35 * flexibility + 0.3 * mean([needs.autonomy, needs.competence, needs.relatedness]);

  // ----- 10.6 Expansion / Protection -----
  const maxTrigger = Math.max(...TRIGGER_CODES.map((c) => triggers[c]));
  const expansion = 0.55 * stateIndex + 0.25 * (100 - reactivity) + 0.2 * (100 - maxTrigger);
  const protectionCoping = STRESS_COPING[primary];
  const protection = 0.4 * coping[protectionCoping] + 0.35 * (100 - stateIndex) + 0.25 * reactivity;

  // ----- 10.7 Growth -----
  const readiness = 0.4 * stateIndex + 0.35 * expansion + 0.25 * needs.relatedness;
  const gBand = growthBand(readiness);
  const experiments: 0 | 2 | 3 = gBand === "high" ? 3 : gBand === "mid" ? 2 : 0;

  // ----- 10.8 메시지 -----
  const resonance: Scores<CoreType> = {
    T1: schemas.US,
    T2: schemas.SS,
    T3: schemas.AS,
    T4: schemas.DEF,
    T5: attachment.AVO,
    T6: mean([attachment.ANX, schemas.ABN]),
    T7: triggers.ST4,
    T8: schemas.MIS,
    T9: triggers.ST5,
  };
  const messageScore = zeros(CORE_TYPES);
  for (const t of CORE_TYPES) messageScore[t] = 0.6 * typeScore[t] + 0.4 * resonance[t];
  // 동점 순서는 미정의 → n 순(가정).
  const messageRanking = [...CORE_TYPES].sort(
    (a, b) => messageScore[b] - messageScore[a] || CORE_TYPES.indexOf(a) - CORE_TYPES.indexOf(b),
  );
  const rank1 = messageRanking[0];
  const gap = messageScore[rank1] - messageScore[messageRanking[1]];

  return {
    core: {
      raw, typeScore, firstPicks, motive, ranking, primary, status, tiedWith, secondary,
      strongSecondary, separation, confidence, weakMotive,
      channel: { scores: channelScores, primary: channelPrimary },
    },
    values: { capped },
    attachment,
    schemas,
    consistency: { inconsistentSchemas, flag: consistencyFlag },
    stress: {
      triggers, vulnerable, reactivity, reactivityBand: reactivityBand(reactivity),
      coping, dominantCoping, coreMatch,
    },
    state: { selfCompassion, flexibility, needs, index: stateIndex, band: stateBand(stateIndex) },
    modes: {
      expansion, expansionBand: modeBand(expansion),
      protection, protectionBand: modeBand(protection),
      growthDirection: EXPANSION_DIRECTION[primary],
      stressDirection: STRESS_DIRECTION[primary],
      protectionCoping,
    },
    growth: { readiness, band: gBand, experiments },
    message: {
      score: messageScore,
      ranking: messageRanking,
      rank1,
      rank2: gap <= 8 ? messageRanking[1] : null,
      gap,
      coreMatch: rank1 === primary,
    },
  };
}

// ---------- 6장 응답 일관성 (두 해석) ----------

const schemaPairs = () =>
  SCHEMA_CODES.map((code) => {
    const items = PART3.filter((i) => i.code === code);
    return { code, pos: items.find((i) => !i.reverse)!, rev: items.find((i) => i.reverse)! };
  });

/**
 * 해석 A(채택): 괄호 안 "역채점 후 기준으로 4점 이상 차이".
 * |scored(정) − scored(역)| ≥ 4 인 스키마.
 */
export function inconsistentSchemasByScoredGap(answers: Answers): SchemaCode[] {
  return schemaPairs()
    .filter(({ pos, rev }) => Math.abs(scored(answers, pos) - scored(answers, rev)) >= 4)
    .map((p) => p.code);
}

/**
 * 해석 B(비교용, 미채택): 본문 "정·역 쌍의 응답 차이가 0 또는 1" — 원응답 기준 |정 − 역| ≤ 1.
 * 두 해석은 서로 다른 집합을 만든다(reference-notes.md 참조).
 */
export function inconsistentSchemasByRawGap(answers: Answers): SchemaCode[] {
  return schemaPairs()
    .filter(({ pos, rev }) => Math.abs(likertValue(answers, pos.id) - likertValue(answers, rev.id)) <= 1)
    .map((p) => p.code);
}
