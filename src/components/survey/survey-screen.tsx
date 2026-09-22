"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import questions from "../../data/questions.json";
import { scoreSurvey } from "../../lib/scoring";
import { emptySession, missingQuestions, navigateSession, restoreSession, SESSION_KEY, sessionHash, type SurveySession } from "../../lib/survey-session";
import type { SurveyAnswerValue } from "../../types/survey";

const labels = ["전혀 가깝지 않다", "별로 가깝지 않다", "어느 쪽도 아니다", "꽤 가깝다", "매우 가깝다"];

export default function SurveyScreen() {
  const router = useRouter();
  const [session, setSession] = useState<SurveySession>(emptySession);
  const current = useRef(session);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const question = questions[session.index];
  const missing = missingQuestions(session.answers);
  const answered = questions.length - missing.length;
  const percent = Math.round(answered / questions.length * 100);

  function persist(next: SurveySession) {
    current.current = next;
    setSession(next);
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(next)); setStorageError(false); return true; }
    catch { setStorageError(true); return false; }
  }
  function move(next: SurveySession) {
    persist(next);
    if (window.location.hash !== sessionHash(next)) history.pushState(null, "", sessionHash(next));
    setNotice("");
  }
  useEffect(() => {
    let restored = emptySession();
    let failed = false;
    try { restored = restoreSession(localStorage.getItem(SESSION_KEY)); } catch { failed = true; }
    // Returning from /result opens review with all answers intact.
    if (restored.stage === "result") restored = { ...restored, stage: "review" };
    current.current = restored;
    history.replaceState(null, "", sessionHash(restored));
    startTransition(() => { setSession(restored); setStorageError(failed); setReady(true); });
    const onPop = () => {
      let next = navigateSession(current.current, window.location.hash);
      if (next.stage === "result") next = { ...next, stage: "review" };
      current.current = next;
      setSession(next);
      try { localStorage.setItem(SESSION_KEY, JSON.stringify(next)); setStorageError(false); }
      catch { setStorageError(true); }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => { if (ready) heading.current?.focus(); }, [session.index, session.stage, ready]);

  function restart() {
    if (!window.confirm("저장된 응답을 모두 지우고 처음부터 시작할까요?")) return;
    const next = emptySession();
    persist(next);
    history.replaceState(null, "", sessionHash(next));
    setNotice("응답을 초기화했습니다. 첫 문항부터 다시 시작합니다.");
  }
  function submit() {
    const unanswered = missingQuestions(current.current.answers);
    if (unanswered.length) { setNotice(`${unanswered.length}개 문항에 아직 답하지 않았어요. 모든 문항에 답한 뒤 결과를 확인해주세요.`); return; }
    scoreSurvey(current.current.answers);
    const next: SurveySession = { ...current.current, stage: "result" };
    if (persist(next)) router.push("/result");
    else {
      current.current = { ...next, stage: "review" };
      setSession(current.current);
      setNotice("결과를 표시하기 위한 저장에 실패했어요. 브라우저의 저장 설정을 확인한 뒤 다시 제출해주세요.");
    }
  }
  return <div className="survey-shell">
    <header className="site-header"><span className="wordmark">SELF<span>—</span>LAYERS<span className="brand-dot">.</span></span><span className="header-caption">나를 이해하는 시간</span><button className="text-button restart" onClick={restart} disabled={!ready || answered === 0}>처음부터</button></header>
    <main className="survey-main">
      {!ready ? <div className="loading-state" role="status">저장된 응답을 불러오고 있어요.</div> : <>
        {storageError && <p className="storage-warning" role="alert">이 브라우저에서 응답을 저장하지 못했어요. 지금 답변은 유지되지만, 새로고침하거나 페이지를 떠나면 복구되지 않을 수 있어요.</p>}
        <div className="progress-section"><div className="progress-meta"><span>{session.stage === "result" ? "검사 완료" : "자기이해 검사"}</span><span><strong>{answered}</strong> / 108 응답 · {percent}%</span></div><progress max={108} value={answered} aria-label="전체 응답 진행률" /></div>
        {session.stage === "question" && <section className="question-panel" aria-labelledby="question-title">
          <div className="question-meta"><span className="eyebrow">지금의 나를 떠올려보세요</span><span className="question-number">문항 {session.index + 1} <span>/ 108</span></span></div>
          <h1 id="question-title" ref={heading} tabIndex={-1}>{question.text}</h1>
          <p className="question-help" id="question-help">정답은 없어요. 평소 내 모습에 얼마나 가까운지 골라주세요.</p>
          <fieldset className="answer-list" aria-labelledby="question-title" aria-describedby="question-help" key={question.id}><legend className="sr-only">응답 선택</legend>
            {labels.map((label, index) => {
              const value = index + 1 as SurveyAnswerValue;
              const selected = session.answers[question.id] === value;
              return <label className={`answer-option${selected ? " selected" : ""}`} key={value}><input type="radio" name={question.id} value={value} checked={selected} onChange={() => { persist({ ...current.current, answers: { ...current.current.answers, [question.id]: value } }); setNotice(""); }} /><span className="answer-value" aria-hidden="true">{value}</span><span className="answer-label"><span className="sr-only">{value} </span>{label}</span><span className="answer-check" aria-hidden="true">{selected ? "✓" : ""}</span></label>;
            })}
          </fieldset>
          <nav className="step-navigation" aria-label="문항 이동"><button className="secondary-button" disabled={session.index === 0} onClick={() => move({ ...current.current, index: session.index - 1 })}><span aria-hidden="true">←</span> 이전</button><button className="primary-button" disabled={session.answers[question.id] === undefined} onClick={() => move(session.index === 107 ? { ...current.current, stage: "review" } : { ...current.current, index: session.index + 1 })}>{session.index === 107 ? "응답 확인" : "다음 문항"} <span aria-hidden="true">→</span></button></nav>
        </section>}
        {session.stage === "review" && <section className="review-panel"><span className="eyebrow">마지막으로 살펴볼까요?</span><h1 ref={heading} tabIndex={-1}>나의 응답이 모였어요.</h1><p className="section-description">108개 중 {answered}개 문항에 답했어요. 번호를 누르면 응답을 확인하거나 바꿀 수 있어요.</p>
          <div className="review-grid" aria-label="전체 문항 응답 확인">{questions.map((q, index) => <button key={q.id} className={session.answers[q.id] === undefined ? "unanswered" : "answered"} aria-label={`${index + 1}번 문항, ${session.answers[q.id] === undefined ? "미응답" : `${session.answers[q.id]}점`}`} onClick={() => move({ ...current.current, index, stage: "question" })}>{index + 1}</button>)}</div>
          {missing.length > 0 && <p className="review-warning">아직 {missing.length}개 문항이 남아 있어요.</p>}
          <nav className="step-navigation" aria-label="제출 전 확인"><button className="secondary-button" onClick={() => move({ ...current.current, stage: "question" })}>이전</button><button className="primary-button" onClick={submit}>결과 확인하기 <span aria-hidden="true">→</span></button></nav>
        </section>}
        <p className="live-notice" role="status">{notice}</p>
        <footer className="survey-footer"><span className="save-mark" aria-hidden="true">{storageError ? "!" : "✓"}</span>{storageError ? "임시 저장을 사용할 수 없어요" : "응답은 이 브라우저에 자동 저장돼요"}<p>잠시 쉬었다 돌아와도 괜찮아요. 나의 속도로 답해주세요.</p></footer>
      </>}
    </main><footer className="site-footer"><span>SELF-LAYERS</span><span>하나의 유형보다, 나를 이루는 여러 겹.</span></footer>
  </div>;
}
