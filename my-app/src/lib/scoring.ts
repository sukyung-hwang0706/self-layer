import questions from "../data/questions.json";
import dimensionData from "../data/dimensions.json";
import type { SurveyAnswers, SurveyDimension } from "../types/survey";
import type { DimensionScore, ResponseQuality, SurveyScore } from "../types/result";

const dimensions = dimensionData as SurveyDimension[];
const questionIds = new Set(questions.map((question) => question.id));

function assertAnswer(value: unknown): asserts value is 1 | 2 | 3 | 4 | 5 {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new RangeError("응답값은 1~5 사이의 정수여야 합니다.");
  }
}

/** Applies the source reverse flag exactly; never infers it from wording. */
export function correctAnswer(value: number, reverse: boolean): number {
  assertAnswer(value);
  return reverse ? 6 - value : value;
}

/** Deterministic scoring against the versioned 108-question bank. */
export function scoreSurvey(answers: Readonly<SurveyAnswers>): SurveyScore {
  if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
    throw new TypeError("응답은 문항 ID를 키로 하는 객체여야 합니다.");
  }
  for (const [id, value] of Object.entries(answers)) {
    if (!questionIds.has(id)) throw new Error(`알 수 없는 문항 ID: ${id}`);
    if (value !== undefined) assertAnswer(value);
  }

  const frequencies = [0, 0, 0, 0, 0];
  const corrected = new Map<string, number>();
  for (const question of questions) {
    const answer = Object.hasOwn(answers, question.id) ? answers[question.id] : undefined;
    if (answer === undefined) continue;
    frequencies[answer - 1]++;
    corrected.set(question.id, correctAnswer(answer, question.reverse));
  }

  const dimensionScores = Object.fromEntries(dimensions.map((dimension) => {
    const values = questions
      .filter((question) => question.dimensionCode === dimension.code)
      .flatMap((question) => {
        const value = corrected.get(question.id);
        return value === undefined ? [] : [value];
      });
    const base = {
      code: dimension.code,
      name: dimension.name,
      area: dimension.area,
      answeredCount: values.length,
      missingCount: 4 - values.length,
    };
    let result: DimensionScore;
    if (values.length < 3) {
      result = { ...base, status: "pending", mean: null, score: null };
    } else {
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      result = { ...base, status: "scored", mean, score: (mean - 1) / 4 * 100 };
    }
    return [dimension.code, result];
  })) as SurveyScore["dimensions"];

  const totalCount = questions.length;
  const mostFrequentCount = Math.max(...frequencies);
  const extremeCount = frequencies[0] + frequencies[4];
  const quality: ResponseQuality = {
    totalCount,
    answeredCount: corrected.size,
    missingCount: totalCount - corrected.size,
    mostFrequentCount,
    extremeCount,
    uniformRatio: mostFrequentCount / totalCount,
    extremeRatio: extremeCount / totalCount,
    warnings: [],
  };
  // Integer comparison avoids rounding a ratio across the 90% boundary.
  if (mostFrequentCount * 10 >= totalCount * 9) quality.warnings.push("uniform-responses");
  if (extremeCount * 10 >= totalCount * 9) quality.warnings.push("extreme-responses");

  return { scoringVersion: "1.0.0", dimensions: dimensionScores, quality };
}
