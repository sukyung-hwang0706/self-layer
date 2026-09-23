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
export type OptionKey = "A" | "B" | "C";
export type LikertValue = 1 | 2 | 3 | 4 | 5;

/** 리커트 문항이 측정하는 코드. */
export type LikertCode = CoreType | AttachmentCode | SchemaCode | TriggerCode | "SR" | CopingCode | StateCode;

export interface ChoiceOption { key: OptionKey; text: string; type: CoreType; value: ValueCode }
export interface ChoiceItem { id: string; part: 1; kind: "choice"; context: ContextTag; stem: string; options: readonly [ChoiceOption, ChoiceOption, ChoiceOption] }
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

export interface ValueResult {
  capped: Scores<ValueCode>;
  selection: Scores<ValueCode>;
  contextsHit: Scores<ValueCode>;
  contextsAvailable: Scores<ValueCode>;
  diversity: Scores<ValueCode>;
  score: Scores<ValueCode>;
  ranking: ValueCode[];
  top3: ValueCode[];
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
