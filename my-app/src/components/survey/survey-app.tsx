"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DISPLAY_ORDER, ITEM_BY_ID, PARTS, TOTAL_ITEMS } from "../../data/items";
import { isValidAnswer, missingItems } from "../../lib/scoring";
import { cleanName, emptySession, isComplete, navigateSession, NAME_MAX, restoreSession, SESSION_KEY, sessionHash, setAnswer, type Session } from "../../lib/session";
import type { Answer, ChoiceAnswer, LikertValue, PartNumber, RankAnswer } from "../../types/assessment";
import { ChoiceQuestion, LikertQuestion, RankQuestion } from "./questions";

export const PART_LAYER: Record<PartNumber, string> = { 1: "l-core", 2: "l-pat", 3: "l-rel", 4: "l-str", 5: "l-state", 6: "l-dir" };
const partOf = (id: string) => ITEM_BY_ID.get(id)!.part;
const PART_RANGE = PARTS.map((p) => {
  const indexes = DISPLAY_ORDER.flatMap((id, i) => (partOf(id) === p.part ? [i] : []));
  return { ...p, start: indexes[0], end: indexes[indexes.length - 1], total: indexes.length };
});

export default function SurveyApp() {
  const router = useRouter();
  const [session, setSession] = useState<Session>(emptySession);
  const current = useRef(session);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const advanceTimer = useRef<number | undefined>(undefined);
  const firstRender = useRef(true);

  const missing = missingItems(session.answers);
  const answered = TOTAL_ITEMS - missing.length;
  const id = DISPLAY_ORDER[session.index];
  const item = ITEM_BY_ID.get(id)!;
  const part = PART_RANGE[item.part - 1];

  function persist(next: Session) {
    current.current = next;
    setSession(next);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(next)); setStorageError(false); return true; }
    catch { setStorageError(true); return false; }
  }
  function go(next: Session) {
    window.clearTimeout(advanceTimer.current);
    persist(next);
    if (window.location.hash !== sessionHash(next)) history.pushState(null, "", sessionHash(next));
    setNotice("");
  }

  useEffect(() => {
    let restored = emptySession(), failed = false;
    try { restored = restoreSession(localStorage.getItem(SESSION_KEY)); } catch { failed = true; }
    restored = navigateSession(restored, window.location.hash);
    current.current = restored;
    history.replaceState(null, "", sessionHash(restored));
    startTransition(() => { setSession(restored); setStorageError(failed); setReady(true); });
    const onPop = () => {
      window.clearTimeout(advanceTimer.current);
      const next = navigateSession(current.current, window.location.hash);
      current.current = next;
      setSession(next);
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(next)); } catch { setStorageError(true); }
    };
    window.addEventListener("popstate", onPop);
    return () => { window.removeEventListener("popstate", onPop); window.clearTimeout(advanceTimer.current); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (firstRender.current) { firstRender.current = false; return; }
    heading.current?.focus();
    window.scrollTo({ top: 0 });
  }, [session.index, session.stage, ready]);

  function answer(value: Answer | undefined) {
    persist(setAnswer(current.current, id, value));
    setNotice("");
  }
  function next() {
    const s = current.current;
    go(s.index === TOTAL_ITEMS - 1 ? { ...s, stage: "review" } : { ...s, index: s.index + 1 });
  }
  function onLikertPicked(byPointer: boolean) {
    if (!byPointer) return;
    const at = current.current.index;
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(() => { if (current.current.index === at && current.current.stage === "question") next(); }, 260);
  }
  function start() {
    const s = current.current;
    const firstMissing = DISPLAY_ORDER.findIndex((qid) => !isValidAnswer(qid, s.answers[qid]));
    go(firstMissing === -1 ? { ...s, stage: "review" } : { ...s, stage: "question", index: firstMissing });
  }
  function restart() {
    if (!window.confirm("저장된 응답을 모두 지우고 처음부터 시작할까요?")) return;
    const fresh = { ...emptySession(), name: current.current.name };
    persist(fresh);
    history.replaceState(null, "", sessionHash(fresh));
    setNotice("응답을 모두 지웠어요.");
  }
  function submit() {
    const s = current.current;
    const left = missingItems(s.answers);
    if (left.length) { setNotice(`아직 ${left.length}개 문항이 남아 있어요. 표시된 번호를 눌러 답해주세요.`); return; }
    const done: Session = { ...s, completedAt: s.completedAt ?? new Date().toISOString() };
    if (persist(done)) router.push("/result");
    else setNotice("결과를 보여주기 위한 저장에 실패했어요. 브라우저의 저장 설정을 확인한 뒤 다시 시도해주세요.");
  }

  const titleId = `q-${id}`;
  const isPartStart = session.index === part.start;
  const partAnswered = (p: (typeof PART_RANGE)[number]) => DISPLAY_ORDER.slice(p.start, p.end + 1).filter((qid) => isValidAnswer(qid, session.answers[qid])).length;
  const helpText = item.kind === "choice" ? "나와 가장 가까운 답을 먼저 누르고, 그다음으로 가까운 답을 눌러주세요." :
    item.kind === "rank" ? "가장 가까운 것부터 차례로 눌러주세요. 두 개를 고르면 나머지가 3순위가 돼요." :
    item.part === 5 ? "성격이 아니라 지난 한 달 동안의 모습으로 답해주세요." : "정답은 없어요. 떠오르는 대로 골라주세요.";
  const remainingMin = Math.max(1, Math.round(PART_RANGE.reduce((sum, p) => sum + p.minutes * (1 - partAnswered(p) / p.total), 0)));

  return <div className="shell">
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#start" onClick={(e) => { e.preventDefault(); go({ ...current.current, stage: "intro" }); }}>SELF-LAYERS</a>
        <span className="spacer" />
        {ready && session.stage !== "intro" && <button className="btn-text" onClick={() => go({ ...current.current, stage: "review" })}>전체 응답 보기</button>}
      </div>
      {ready && session.stage !== "intro" && <div className="progress">
        <div className="progress-meta"><span>{session.stage === "review" ? "응답 확인" : `Part ${item.part} · ${part.title}`}</span><span><strong>{answered}</strong> / {TOTAL_ITEMS} · 약 {remainingMin}분 남음</span></div>
        <div className="steps" role="progressbar" aria-label="전체 응답 진행률" aria-valuemin={0} aria-valuemax={TOTAL_ITEMS} aria-valuenow={answered}>
          {PART_RANGE.map((p) => <div key={p.part} className={`step ${PART_LAYER[p.part]}`}><span style={{ width: `${partAnswered(p) / p.total * 100}%` }} /></div>)}
        </div>
      </div>}
    </header>

    <main className="main">
      {!ready ? <p role="status">저장된 응답을 불러오고 있어요.</p> : <>
        {storageError && <p className="warning" role="alert">이 브라우저에서 응답을 저장하지 못했어요. 지금 답변은 유지되지만, 새로고침하거나 페이지를 떠나면 복구되지 않을 수 있어요.</p>}

        {session.stage === "intro" && <section className="intro" aria-labelledby="intro-title">
          <div className="intro-kicker">SELF-LAYERS · V1.0</div>
          <h1 id="intro-title" ref={heading} tabIndex={-1}>나를 이루는<br />여러 겹의 이야기</h1>
          <p className="sub">한 사람을 하나의 이름으로 부르지 않아요. 무엇이 나를 움직이는지, 요즘 마음의 여유는 어떤지, 관계에서 무엇에 예민한지, 무엇이 나를 흔드는지를 여섯 개의 층으로 겹쳐 봐요.</p>
          <ol className="part-list" aria-label="검사 구성">
            {PART_RANGE.map((p) => <li key={p.part} className={PART_LAYER[p.part]}>
              <span className="num">{p.part}</span>
              <span className="t">{p.title}<span className="q">{p.question}</span></span>
              <span className="m">{p.total}문항</span>
            </li>)}
          </ol>
          <p className="small">총 {TOTAL_ITEMS}문항 · 약 18분. 응답은 이 브라우저에만 자동 저장되어, 잠시 쉬었다 이어서 해도 괜찮아요.</p>
          <div className="field">
            <label htmlFor="name">리포트에 표시할 이름 <span className="hint">(선택)</span></label>
            <input id="name" autoComplete="nickname" maxLength={NAME_MAX} value={session.name} placeholder="비워두면 ‘당신’으로 불러요"
              onChange={(e) => persist({ ...current.current, name: e.target.value.slice(0, NAME_MAX) })}
              onBlur={(e) => persist({ ...current.current, name: cleanName(e.target.value) })} />
          </div>
          <div className="cta">
            <button className="btn btn-primary" onClick={start}>{answered === 0 ? "검사 시작하기" : isComplete(session) ? "응답 확인하고 결과 보기" : `이어서 하기 (${answered}/${TOTAL_ITEMS})`} <span aria-hidden="true">→</span></button>
            {answered > 0 && <button className="btn btn-ghost" onClick={restart}>처음부터 다시 하기</button>}
          </div>
          <p className="fine">SELF-LAYERS는 자기이해와 성찰을 위한 도구이며, 정신건강 상태나 질환을 진단하는 임상적 검사가 아니에요. 점수는 다른 사람과의 비교 순위가 아니라 내 응답의 강도예요.</p>
        </section>}

        {session.stage === "question" && <section className={PART_LAYER[item.part]} aria-labelledby={titleId} key={id}>
          <div className="part-head"><span className="chip">Part {item.part} · {part.title}</span><span className="count">{session.index - part.start + 1} / {part.total}</span></div>
          {isPartStart && <div className="part-intro"><b>{part.question}</b>{part.instruction}</div>}
          {item.kind === "likert" && item.lead && <p className="q-lead">{item.lead}</p>}
          <h1 className="q-title" id={titleId} ref={heading} tabIndex={-1}>{item.kind === "likert" ? item.text : item.stem}</h1>
          <p className="q-help" id={`${titleId}-help`}>{helpText}</p>
          {item.kind === "choice" && <ChoiceQuestion item={item} titleId={titleId} answer={session.answers[id] as ChoiceAnswer | undefined} onAnswer={answer} />}
          {item.kind === "likert" && <LikertQuestion item={item} titleId={titleId} answer={session.answers[id] as LikertValue | undefined} onAnswer={answer} onPicked={onLikertPicked} />}
          {item.kind === "rank" && <RankQuestion item={item} titleId={titleId} answer={session.answers[id] as RankAnswer | undefined} onAnswer={answer} />}
          <nav className="nav" aria-label="문항 이동">
            <button className="btn btn-ghost" onClick={() => go(session.index === 0 ? { ...current.current, stage: "intro" } : { ...current.current, index: session.index - 1 })}><span aria-hidden="true">←</span> 이전</button>
            <button className="btn btn-primary" disabled={!isValidAnswer(id, session.answers[id])} onClick={next}>{session.index === TOTAL_ITEMS - 1 ? "응답 확인" : "다음"} <span aria-hidden="true">→</span></button>
          </nav>
        </section>}

        {session.stage === "review" && <section className="review" aria-labelledby="review-title">
          <span className="small">마지막으로 살펴볼까요?</span>
          <h1 id="review-title" ref={heading} tabIndex={-1}>{missing.length ? "아직 남은 문항이 있어요" : "모든 응답이 모였어요"}</h1>
          <p className="q-help">번호를 누르면 그 문항으로 돌아가 응답을 확인하거나 바꿀 수 있어요.</p>
          <div className="summary-row"><span>응답 {answered}개</span>{missing.length > 0 && <span>남은 문항 {missing.length}개</span>}</div>
          {PART_RANGE.map((p) => <div key={p.part} className={`review-part ${PART_LAYER[p.part]}`}>
            <h2>Part {p.part} · {p.title} <small>{partAnswered(p)} / {p.total}</small></h2>
            <div className="review-grid">
              {DISPLAY_ORDER.slice(p.start, p.end + 1).map((qid, k) => {
                const index = p.start + k, done = isValidAnswer(qid, session.answers[qid]);
                return <button key={qid} className={done ? "done" : "todo"} aria-label={`${index + 1}번 문항, ${done ? "응답함" : "미응답"}`} onClick={() => go({ ...current.current, stage: "question", index })}>{index + 1}</button>;
              })}
            </div>
          </div>)}
          <nav className="nav" aria-label="제출">
            <button className="btn btn-ghost" onClick={() => go({ ...current.current, stage: "question" })}><span aria-hidden="true">←</span> 문항으로</button>
            <button className="btn btn-primary" onClick={submit}>결과 리포트 보기 <span aria-hidden="true">→</span></button>
          </nav>
        </section>}

        <p className="notice" role="status">{notice}</p>
      </>}
    </main>
    <footer className="footer-note"><span>SELF-LAYERS</span><span>하나의 유형보다, 나를 이루는 여러 겹.</span></footer>
  </div>;
}
