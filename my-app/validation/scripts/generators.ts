// 시드 고정 응답 생성기(검증 가정 V4). 앱 엔진은 무작위값을 쓰지 않으며 이 파일은 검증 입력 생성에만 쓴다.
import { DISPLAY_ORDER, ITEM_BY_ID } from "../../src/data/items";
import type { Answer, Answers, LikertItem, LikertValue, OptionKey, RankAnswer } from "../../src/types/assessment";

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;
const RANK_KEYS: readonly OptionKey[] = ["A", "B", "C"];
const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const likert = (rng: Rng, from: LikertValue, to: LikertValue) => (from + Math.floor(rng() * (to - from + 1))) as LikertValue;

export function shuffle<T>(rng: Rng, xs: readonly T[]): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function randomChoice(rng: Rng, keys: readonly OptionKey[]) {
  const [first, second] = shuffle(rng, keys);
  return { first, second };
}

/** 사회적 바람직성: 정방향 문제 신호(관계·패턴·흔들림)는 낮게, 건강 쪽 문항(역채점·Part 5 정방향)은 높게. */
function desirable(rng: Rng, item: LikertItem): LikertValue {
  if (item.part === 2) return likert(rng, 2, 4);
  const healthy = item.part === 5 ? !item.reverse : item.reverse;
  return healthy ? likert(rng, 4, 5) : likert(rng, 1, 2);
}

export const STYLES = {
  uniform: "Part 1 무작위 · 5점 1–5 균등 · Part 6 무작위",
  all3: "Part 1 무작위 · 5점 전부 3",
  extreme: "Part 1 무작위 · 5점 1 또는 5",
  acquiescent: "Part 1 무작위 · 5점 4 또는 5",
  desirable: "Part 1 무작위 · 문제 신호 1–2, 건강 문항 4–5 (사회적 바람직성)",
  firstA: "Part 1 항상 A→B · 5점 균등",
  firstB: "Part 1 항상 B→C · 5점 균등",
  firstC: "Part 1 항상 C→D · 5점 균등",
  firstD: "Part 1 항상 D→A · 5점 균등",
} as const;
export type Style = keyof typeof STYLES;

export function generate(style: Style, rng: Rng): Answers {
  const answers: Record<string, Answer> = {};
  for (const id of DISPLAY_ORDER) {
    const item = ITEM_BY_ID.get(id);
    if (!item) throw new Error(id);
    if (item.kind === "choice") {
      if (style === "firstA") answers[id] = { first: "A", second: "B" };
      else if (style === "firstB") answers[id] = { first: "B", second: "C" };
      else if (style === "firstC") answers[id] = { first: "C", second: "D" };
      else if (style === "firstD") answers[id] = { first: "D", second: "A" };
      else answers[id] = randomChoice(rng, item.options.map((o) => o.key));
    } else if (item.kind === "rank") {
      answers[id] = shuffle(rng, RANK_KEYS) as unknown as RankAnswer;
    } else {
      answers[id] =
        style === "all3" ? 3
          : style === "extreme" ? pick(rng, [1, 5] as const)
            : style === "acquiescent" ? likert(rng, 4, 5)
              : style === "desirable" ? desirable(rng, item)
                : likert(rng, 1, 5);
    }
  }
  return answers;
}
