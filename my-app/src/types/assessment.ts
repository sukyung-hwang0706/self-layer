/** SELF-LAYERS V1.0 (76문항) 공통 타입. 코드는 설계서의 내부 식별자이며 사용자 화면에 노출하지 않는다. */

export const CORE_TYPES = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9"] as const;
export type CoreType = (typeof CORE_TYPES)[number];

export const VALUE_CODES = ["ACH", "AUT", "REL", "SEC", "GROW", "AUTH", "CONTR", "EXP"] as const;
export type ValueCode = (typeof VALUE_CODES)[number];

export const SCHEMA_CODES = ["ABN", "ED", "MIS", "DEF", "DEP", "SS", "AS", "US"] as const;
export type SchemaCode = (typeof SCHEMA_CODES)[number];

export const ATTACHMENT_CODES = ["ANX", "AVO"] as const;
export type AttachmentCode = (typeof ATTACHMENT_CODES)[number];

export const TRIGGER_CODES = ["ST1", "ST2", "ST3", "ST4", "ST5", "ST6"] as const;
export type TriggerCode = (typeof TRIGGER_CODES)[number];

/** Part 4 대처 방식. 설계서 코드 SC1~SC6을 그대로 쓴다(자기자비 SC와는 다른 코드). */
export const COPING_CODES = ["SC1", "SC2", "SC3", "SC4", "SC5", "SC6"] as const;
export type CopingCode = (typeof COPING_CODES)[number];

export const STATE_CODES = ["SC", "FLX", "N-AUT", "N-COM", "N-REL"] as const;
export type StateCode = (typeof STATE_CODES)[number];

export const CHANNELS = ["SP", "SO", "SX"] as const;
export type Channel = (typeof CHANNELS)[number];

export type ContextTag = "변화" | "관계" | "회복" | "성과" | "갈등" | "기회" | "미래" | "규칙";

export type PartNumber = 1 | 2 | 3 | 4 | 5 | 6;
/** 선택지 키. Part 1은 A~D(4지선다), Part 6은 A~C를 쓴다. 문항별 허용 키는 그 문항의 options가 정한다. */
export type OptionKey = "A" | "B" | "C" | "D";
export type LikertValue = 1 | 2 | 3 | 4 | 5;

/** 리커트 문항이 측정하는 코드. */
export type LikertCode = CoreType | AttachmentCode | SchemaCode | TriggerCode | "SR" | CopingCode | StateCode;

export interface ChoiceOption { key: OptionKey; text: string; type: CoreType; value: ValueCode }
export interface ChoiceItem { id: string; part: 1; kind: "choice"; context: ContextTag; stem: string; options: readonly [ChoiceOption, ChoiceOption, ChoiceOption, ChoiceOption] }
export interface LikertItem { id: string; part: 2 | 3 | 4 | 5; kind: "likert"; text: string; code: LikertCode; reverse: boolean; lead?: string }
export interface RankOption { key: OptionKey; text: string; channel: Channel }
export interface RankItem { id: string; part: 6; kind: "rank"; stem: string; options: readonly [RankOption, RankOption, RankOption] }
export type Item = ChoiceItem | LikertItem | RankItem;

export interface ChoiceAnswer { first: OptionKey; second: OptionKey }
/** 1·2·3순위 순서대로 선택지 키를 담는다. */
export type RankAnswer = readonly [OptionKey, OptionKey, OptionKey];
export type Answer = ChoiceAnswer | LikertValue | RankAnswer;
export type Answers = Readonly<Record<string, Answer>>;

export type Scores<K extends string> = Record<K, number>;
export type StateBand = "expansion" | "balanced" | "protection";
export type Level3 = "high" | "mid" | "low";

export interface CoreResult {
  raw: Scores<CoreType>;
  typeScore: Scores<CoreType>;
  firstPicks: Scores<CoreType>;
  /** Part 2 동기 진술 M(Tn), 0~100 */
  motive: Scores<CoreType>;
  /** 설계서 동점 규칙(TypeScore → M → 1순위 횟수)으로 정렬, 완전 동점은 T번호 순 */
  ranking: CoreType[];
  primary: CoreType;
  /** 세 단계 동점 규칙으로도 갈리지 않으면 undetermined(혼합/판정 유보) */
  status: "determined" | "undetermined";
  tiedWith: CoreType[];
  secondary: CoreType;
  strongSecondary: boolean;
  separation: number;
  confidence: number;
  weakMotive: boolean;
  influence: { type: CoreType | null; candidates: [CoreType, CoreType] };
  channel: { scores: Scores<Channel>; primary: Channel };
}

/** 보정 전 가치 계산(설계서 10.3 결합 점수와 선택 근거). */
export interface RawValueResult {
  capped: Scores<ValueCode>;
  selection: Scores<ValueCode>;
  contextsHit: Scores<ValueCode>;
  contextsAvailable: Scores<ValueCode>;
  diversity: Scores<ValueCode>;
  /** 결합 점수 0.6·Selection + 0.4·Diversity. 순위 판단에는 calibrated를 쓴다. */
  score: Scores<ValueCode>;
  /** 그 가치가 보기로 나온 Part 1 문항 수 */
  opportunities: Scores<ValueCode>;
  /** 그 가치의 보기를 1·2순위로 고른 문항 수 */
  picks: Scores<ValueCode>;
}

/** 가치 순위(B안 보정 적용). 앱 임시 규칙이며 docs/scoring-decisions.md에 기록한다. */
export interface ValueResult extends RawValueResult {
  /** 결합 점수를 가치별 무작위 응답 평균·표준편차로 표준화한 값. 순위 판단·내부 분석용이며 화면에 숫자로 보이지 않는다. */
  calibrated: Scores<ValueCode>;
  /** 공동 순위 번호(그룹 첫 가치와의 보정 점수 차이 ≤ 허용폭이면 같은 순위) */
  rank: Scores<ValueCode>;
  /** 보정 점수 내림차순. 같은 순위 안의 순서는 의미가 없다. */
  ranking: ValueCode[];
  /** 공동 1위 */
  first: ValueCode[];
  /** 상위 3(경계 공동 포함, 3개를 넘을 수 있다) */
  top3: ValueCode[];
  top3Tied: boolean;
  calibration: { method: string; fingerprint: string };
}

export interface StressResult {
  triggers: Scores<TriggerCode>;
  vulnerable: TriggerCode[];
  reactivity: number;
  reactivityBand: Level3;
  coping: Scores<CopingCode>;
  dominantCoping: CopingCode[];
  /** 취약 트리거가 없으면 null */
  coreMatch: boolean | null;
}

export interface StateResult {
  selfCompassion: number;
  flexibility: number;
  needs: { autonomy: number; competence: number; relatedness: number };
  index: number;
  band: StateBand;
}

export interface ModesResult {
  expansion: number;
  expansionBand: Level3;
  protection: number;
  protectionBand: Level3;
  growthDirection: CoreType;
  stressDirection: CoreType;
  protectionCoping: CopingCode;
}

export interface MessageResult {
  score: Scores<CoreType>;
  ranking: CoreType[];
  rank1: CoreType;
  /** 1위와 8점 이내일 때만 함께 표시 */
  rank2: CoreType | null;
  gap: number;
  coreMatch: boolean;
}

export interface Reinforcement { core: CoreType; coreRole: "primary" | "secondary"; linked: string; linkedScore: number; strength: number }
export interface Counterevidence { core: CoreType; typical: string[]; typicalScore: number }

export interface AssessmentResult {
  version: string;
  core: CoreResult;
  values: ValueResult;
  attachment: Scores<AttachmentCode>;
  schemas: Scores<SchemaCode>;
  schemaRanking: SchemaCode[];
  consistency: { inconsistentSchemas: SchemaCode[]; flag: boolean };
  stress: StressResult;
  state: StateResult;
  modes: ModesResult;
  growth: { readiness: number; band: Level3; experiments: 0 | 2 | 3 };
  message: MessageResult;
  insights: { reinforcements: Reinforcement[]; counterevidence: Counterevidence | null };
}
