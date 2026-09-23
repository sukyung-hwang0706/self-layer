"use client";

import { useState } from "react";
import { LIKERT_LABELS } from "../../data/items";
import type { ChoiceAnswer, ChoiceItem, LikertItem, LikertValue, OptionKey, RankAnswer, RankItem } from "../../types/assessment";

interface Props<I, A> { item: I; answer: A | undefined; onAnswer: (answer: A | undefined) => void; titleId: string }

/** Part 1: 세 선택지 중 1순위·2순위를 차례로 누른다. 선택된 항목을 다시 누르면 취소된다. */
export function ChoiceQuestion({ item, answer, onAnswer, titleId }: Props<ChoiceItem, ChoiceAnswer>) {
  const [picks, setPicks] = useState<OptionKey[]>(answer ? [answer.first, answer.second] : []);
  function toggle(key: OptionKey) {
    const next = picks.includes(key) ? picks.filter((k) => k !== key) : picks.length < 2 ? [...picks, key] : [picks[0], key];
    setPicks(next);
    onAnswer(next.length === 2 ? { first: next[0], second: next[1] } : undefined);
  }
  return <>
    <div className="options" role="group" aria-labelledby={titleId} aria-describedby={`${titleId}-help`}>
      {item.options.map((opt) => {
        const rank = picks.indexOf(opt.key) + 1;
        return <button key={opt.key} type="button" className={`opt${rank ? " on" : ""}`} aria-pressed={rank > 0} onClick={() => toggle(opt.key)}
          aria-label={`${opt.text}${rank ? `, ${rank}순위로 선택됨` : ""}`}>
          <span className="mark" aria-hidden="true">{rank || ""}</span>
          <span className="txt">{opt.text}</span>
          {rank > 0 && <span className="check" aria-hidden="true">{rank}순위</span>}
        </button>;
      })}
    </div>
    <div className="rank-hint" aria-hidden="true">
      <span className={picks[0] ? "done" : ""}>1순위 {picks[0] ? "선택됨" : "고르기"}</span>
      <span className={picks[1] ? "done" : ""}>2순위 {picks[1] ? "선택됨" : "고르기"}</span>
    </div>
  </>;
}

/** Part 2~5: 5점 평정. 포인터로 고르면 onPicked가 자동 이동을 요청한다. */
export function LikertQuestion({ item, answer, onAnswer, titleId, onPicked }: Props<LikertItem, LikertValue> & { onPicked: (byPointer: boolean) => void }) {
  const [pointer, setPointer] = useState(false);
  return <fieldset className="options likert" aria-labelledby={titleId} onPointerDown={() => setPointer(true)} onKeyDown={() => setPointer(false)}>
    <legend className="sr-only">응답 선택</legend>
    {LIKERT_LABELS.map((label, i) => {
      const value = (i + 1) as LikertValue;
      const on = answer === value;
      return <label key={value} className={`opt${on ? " on" : ""}`}>
        <input type="radio" name={item.id} value={value} checked={on} onChange={() => { onAnswer(value); onPicked(pointer); }} />
        <span className="mark" aria-hidden="true">{value}</span>
        <span className="txt">{label}</span>
        {on && <span className="check" aria-hidden="true">선택</span>}
      </label>;
    })}
  </fieldset>;
}

/** Part 6: 세 가지를 가까운 순서대로 누른다. 두 개를 고르면 남은 하나가 3순위가 된다. */
export function RankQuestion({ item, answer, onAnswer, titleId }: Props<RankItem, RankAnswer>) {
  const [picks, setPicks] = useState<OptionKey[]>(answer ? [...answer] : []);
  function toggle(key: OptionKey) {
    let next: OptionKey[];
    if (picks.includes(key)) next = picks.slice(0, picks.indexOf(key));
    else {
      next = [...picks, key];
      if (next.length === 2) next.push(item.options.map((o) => o.key).find((k) => !next.includes(k))!);
    }
    setPicks(next);
    onAnswer(next.length === 3 ? (next as unknown as RankAnswer) : undefined);
  }
  return <>
    <div className="options" role="group" aria-labelledby={titleId} aria-describedby={`${titleId}-help`}>
      {item.options.map((opt) => {
        const rank = picks.indexOf(opt.key) + 1;
        return <button key={opt.key} type="button" className={`opt${rank ? " on" : ""}`} aria-pressed={rank > 0} onClick={() => toggle(opt.key)}
          aria-label={`${opt.text}${rank ? `, ${rank}순위` : ""}`}>
          <span className="mark" aria-hidden="true">{rank || ""}</span>
          <span className="txt">{opt.text}</span>
          {rank > 0 && <span className="check" aria-hidden="true">{rank}순위</span>}
        </button>;
      })}
    </div>
    <div className="rank-hint" aria-hidden="true">
      {[1, 2, 3].map((n) => <span key={n} className={picks[n - 1] ? "done" : ""}>{n}순위</span>)}
    </div>
  </>;
}
