import { PART1, PART2, PART3, PART4, PART5, PART6 } from "../data/items";
import type { Answer, ChoiceAnswer, LikertValue, RankAnswer } from "../types/assessment";

/** 테스트용 응답 생성기. 기본값: Part 1은 1순위 A·2순위 B, 리커트는 모두 3, Part 6은 A·B·C. */
export function makeAnswers(overrides: Record<string, Answer> = {}): Record<string, Answer> {
  const answers: Record<string, Answer> = {};
  for (const item of PART1) answers[item.id] = { first: "A", second: "B" } satisfies ChoiceAnswer;
  for (const item of [...PART2, ...PART3, ...PART4, ...PART5]) answers[item.id] = 3 as LikertValue;
  answers[PART6[0].id] = ["A", "B", "C"] satisfies RankAnswer;
  return { ...answers, ...overrides };
}
