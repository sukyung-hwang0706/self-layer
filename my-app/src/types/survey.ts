/** Internal area and dimension codes must not be used as user-facing type labels. */
export type SurveyArea = "CORE" | "RELATIONSHIP" | "PATTERN" | "DIRECTION";

export type CoreDimensionCode =
  | "CORE1" | "CORE2" | "CORE3" | "CORE4" | "CORE5"
  | "CORE6" | "CORE7" | "CORE8" | "CORE9";
export type RelationshipDimensionCode = "ANX" | "AVO";
export type PatternDimensionCode = "AS" | "US" | "DEF" | "SS" | "MIS" | "ED" | "ABN" | "DEP";
export type DirectionDimensionCode = "GROW" | "AUT" | "ACH" | "AUTH" | "REL" | "SEC" | "EXP" | "CONTR";
export type DimensionCode = CoreDimensionCode | RelationshipDimensionCode | PatternDimensionCode | DirectionDimensionCode;

export interface SurveyQuestion {
  /** Stable source ID; independent of display order. */
  id: string;
  /** One-based order from the service display sheet. */
  displayOrder: number;
  area: SurveyArea;
  dimensionCode: DimensionCode;
  dimensionName: string;
  role: string;
  /** Final wording, not the historical wording. */
  text: string;
  /** Exact source mapping: Y = true, N = false. */
  reverse: boolean;
  weight: number;
}

export interface SurveyDimension {
  area: SurveyArea;
  code: DimensionCode;
  name: string;
  definition: string;
  /** Boundary with adjacent constructs, for internal interpretation design. */
  boundary: string;
}

export type SurveyAnswerValue = 1 | 2 | 3 | 4 | 5;

/** Missing IDs represent unanswered questions. */
export type SurveyAnswers = Partial<Record<SurveyQuestion["id"], SurveyAnswerValue>>;
