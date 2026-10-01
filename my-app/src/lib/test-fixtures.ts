import { PART1, PART2, PART3, PART4, PART5, PART6 } from "../data/items";
import type { Answer, ChoiceAnswer, ChoiceItem, CoreType, LikertValue, RankAnswer } from "../types/assessment";

/** 기본 선호 순서: 각 문항에서 이 순서로 앞선 유형을 1순위, 그다음을 2순위로 고른다. */
export const DEFAULT_PREF: readonly CoreType[] = ["T1", "T3", "T7", "T8", "T2", "T5", "T6", "T4", "T9"];

/** 선호 순서에 따라 한 문항의 1·2순위를 고른다(선택지 위치와 무관하게 유형으로 고른다). */
export function pickByType(item: ChoiceItem, pref: readonly CoreType[] = DEFAULT_PREF): ChoiceAnswer {
  const [first, second] = [...item.options].sort((a, b) => pref.indexOf(a.type) - pref.indexOf(b.type));
  return { first: first.key, second: second.key };
}

/** 지정한 두 유형의 선택지를 1·2순위로 고른 응답. */
export function pickTypes(item: ChoiceItem, first: CoreType, second: CoreType): ChoiceAnswer {
  const key = (t: CoreType) => item.options.find((o) => o.type === t)?.key;
  const [f, s] = [key(first), key(second)];
  if (!f || !s) throw new Error(`${item.id}에 ${first}·${second} 선택지가 함께 있지 않습니다.`);
  return { first: f, second: s };
}

/** 테스트용 응답 생성기. 기본값: Part 1은 DEFAULT_PREF 순서, 리커트는 모두 3, Part 6은 A·B·C. */
export function makeAnswers(overrides: Record<string, Answer> = {}): Record<string, Answer> {
  const answers: Record<string, Answer> = {};
  for (const item of PART1) answers[item.id] = pickByType(item);
  for (const item of [...PART2, ...PART3, ...PART4, ...PART5]) answers[item.id] = 3 as LikertValue;
  answers[PART6[0].id] = ["A", "B", "C"] satisfies RankAnswer;
  return { ...answers, ...overrides };
}
