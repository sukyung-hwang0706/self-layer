import type { DimensionCode, SurveyArea } from "./survey";

interface DimensionScoreBase {
  code: DimensionCode;
  name: string;
  area: SurveyArea;
  answeredCount: number;
  missingCount: number;
}

export type DimensionScore = DimensionScoreBase & (
  | { status: "scored"; mean: number; score: number }
  | { status: "pending"; mean: null; score: null }
);

export type ScoredDimension = Extract<DimensionScore, { status: "scored" }>;
export type RankedDimension = ScoredDimension & { rank: number };
export type QualityWarning = "uniform-responses" | "extreme-responses";

export interface ResponseQuality {
  totalCount: number;
  answeredCount: number;
  missingCount: number;
  mostFrequentCount: number;
  extremeCount: number;
  uniformRatio: number;
  extremeRatio: number;
  warnings: QualityWarning[];
}

export interface SurveyScore {
  scoringVersion: "1.0.0";
  dimensions: Record<DimensionCode, DimensionScore>;
  quality: ResponseQuality;
}

export interface DimensionRanking {
  status: "complete" | "partial" | "unavailable";
  items: RankedDimension[];
  pendingCodes: DimensionCode[];
}

export interface ResultAnalysis {
  core: DimensionRanking & {
    /** Null while any CORE dimension is pending. Tied leaders have gap 0. */
    topTwoGap: number | null;
    isClose: boolean | null;
  };
  pattern: DimensionRanking & {
    top: RankedDimension[];
    /** Top-ranked patterns meeting the source's score >= 60 criterion. */
    representative: RankedDimension[];
  };
  direction: DimensionRanking & { top: RankedDimension[] };
  relationship: { ANX: DimensionScore; AVO: DimensionScore };
}
