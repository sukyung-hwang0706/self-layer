import type { SurveyScore } from "../types/result";
import { analyzeResults } from "./result-analysis";
import type { SurveyArea } from "../types/survey";

export function intensity(score: number): "낮음" | "보통" | "높음" | "매우 높음" {
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new RangeError("Score must be within 0..100");
  return score < 40 ? "낮음" : score < 60 ? "보통" : score < 75 ? "높음" : "매우 높음";
}

export const layerDescriptions: Record<SurveyArea, { title: string; description: string }> = {
  CORE: { title: "나를 움직이는 중심", description: "익숙한 동기와 반응 방식을 살펴봅니다." },
  RELATIONSHIP: { title: "관계 속의 나", description: "관계 변화와 친밀감에 대한 반응입니다. 두 차원은 아래에서 각각 살펴봅니다." },
  PATTERN: { title: "반복되는 내면의 규칙", description: "압박 속에서 반복되는 생각과 반응을 살펴봅니다." },
  DIRECTION: { title: "내가 향하는 방향", description: "삶의 선택에서 중요하게 여기는 가치를 살펴봅니다." },
};

export function buildResultPresentation(result: SurveyScore) {
  const analysis = analyzeResults(result);
  const primary = analysis.core.items.filter((d) => d.rank === 1);
  const secondary = analysis.core.items.filter((d) => d.rank === 2);
  const directions = analysis.direction.items.filter((d) => d.rank === 1);
  const corePhrase = primary.length === 1 ? `‘${primary[0].name}’이 중심 성향으로 나타나고` : "여러 중심 성향이 같은 강도로 나타나고";
  const directionPhrase = directions.length === 1 ? `‘${directions[0].name}’을 중요한 삶의 방향으로 두고 있어요.` : "여러 삶의 가치를 함께 중요하게 여기고 있어요.";
  const layers = (Object.keys(layerDescriptions) as SurveyArea[]).map((area) => {
    const dimensions = Object.values(result.dimensions).filter((d) => d.area === area);
    const score = dimensions.some((d) => d.score === null) ? null : dimensions.reduce((sum, d) => sum + d.score!, 0) / dimensions.length;
    return { area, ...layerDescriptions[area], score };
  });
  return { analysis, primary, secondary, layers, sentence: `${corePhrase}, ${directionPhrase}` };
}
