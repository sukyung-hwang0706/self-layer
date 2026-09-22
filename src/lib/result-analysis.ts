import type {
  DimensionRanking, DimensionScore, ResultAnalysis, ScoredDimension, SurveyScore,
} from "../types/result";
import type { SurveyArea } from "../types/survey";

/** Competition ranks (1, 1, 3); equal scores always receive equal ranks. */
export function rankDimensions(dimensions: readonly DimensionScore[]): DimensionRanking {
  const sorted = dimensions
    .filter((dimension): dimension is ScoredDimension => dimension.status === "scored")
    .sort((a, b) => b.score - a.score);
  const pendingCodes = dimensions.filter((dimension) => dimension.status === "pending").map((d) => d.code);
  let rank = 0;
  const items = sorted.map((dimension, index) => {
    if (index === 0 || dimension.score !== sorted[index - 1].score) rank = index + 1;
    return { ...dimension, rank };
  });
  return {
    status: items.length === 0 ? "unavailable" : pendingCodes.length ? "partial" : "complete",
    items,
    pendingCodes,
  };
}

/** Pure rank analysis; does not alter scores or generate psychological narratives. */
export function analyzeResults(result: Readonly<SurveyScore>): ResultAnalysis {
  const scores = Object.values(result.dimensions);
  const rankArea = (area: SurveyArea) => rankDimensions(scores.filter((d) => d.area === area));
  const core = rankArea("CORE");
  const pattern = rankArea("PATTERN");
  const direction = rankArea("DIRECTION");
  const topTwoGap = core.status === "complete" && core.items.length >= 2
    ? core.items[0].score - core.items[1].score
    : null;
  const patternTop = pattern.items.filter((dimension) => dimension.rank <= 3);

  return {
    core: { ...core, topTwoGap, isClose: topTwoGap === null ? null : topTwoGap < 5 },
    pattern: {
      ...pattern,
      top: patternTop,
      representative: patternTop.filter((dimension) => dimension.score >= 60),
    },
    direction: { ...direction, top: direction.items.filter((dimension) => dimension.rank <= 3) },
    relationship: {
      ANX: { ...result.dimensions.ANX },
      AVO: { ...result.dimensions.AVO },
    },
  };
}
