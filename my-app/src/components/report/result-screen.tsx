"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DISPLAY_ORDER } from "../../data/items";
import { hashString, NARRATIVE_FIELDS, NARRATIVE_VERSION, type Narrative, type Rejection } from "../../lib/narrative";
import { scoreAssessment, SCORING_VERSION } from "../../lib/scoring";
import { emptySession, isComplete, restoreSession, SESSION_KEY, type Session } from "../../lib/session";
import type { AssessmentResult } from "../../types/assessment";
import Report, { SECTIONS } from "./report";

const NARRATIVE_KEY = "self-layers:v1.0:narrative";
type Ai = { status: "idle" | "loading" | "error"; error?: string } | { status: "ready"; narrative: Narrative; rejected: Rejection[]; show: boolean };
const AI_ERRORS: Record<string, string> = {
  ai_unavailable: "지금은 AI 문장화를 사용할 수 없어요(서버에 API 자격 증명이 설정되지 않았어요). 기본 문장으로 리포트를 읽어주세요.",
  rate_limited: "요청이 많아 잠시 뒤에 다시 시도해주세요.",
  refused: "AI가 이 요청에 대한 문장을 만들지 않았어요. 기본 문장을 유지해요.",
};

function answersKey(session: Session) {
  return hashString(`${NARRATIVE_VERSION}|${SCORING_VERSION}|${JSON.stringify(DISPLAY_ORDER.map((id) => session.answers[id]))}`);
}

type View = { kind: "loading" } | { kind: "empty"; answered: number } | { kind: "ready"; result: AssessmentResult; session: Session };

export default function ResultScreen() {
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "loading" });
  const [ai, setAi] = useState<Ai>({ status: "idle" });

  useEffect(() => {
    let session = emptySession();
    try { session = restoreSession(localStorage.getItem(SESSION_KEY)); } catch { /* 저장소를 쓸 수 없으면 빈 세션 */ }
    const next: View = isComplete(session) && session.completedAt
      ? { kind: "ready", result: scoreAssessment(session.answers), session }
      : { kind: "empty", answered: Object.keys(session.answers).length };
    let cached: Ai | null = null;
    if (next.kind === "ready") {
      try {
        const saved = JSON.parse(localStorage.getItem(NARRATIVE_KEY) ?? "null");
        if (saved?.key === answersKey(session) && saved.narrative && typeof saved.narrative === "object") {
          const narrative = Object.fromEntries(NARRATIVE_FIELDS.flatMap((f) => (typeof saved.narrative[f] === "string" ? [[f, saved.narrative[f]]] : [])));
          cached = { status: "ready", narrative, rejected: [], show: true };
        }
      } catch { /* 캐시가 없거나 손상되면 무시 */ }
    }
    startTransition(() => { setView(next); if (cached) setAi(cached); });
  }, []);

  async function generate() {
    if (view.kind !== "ready") return;
    setAi({ status: "loading" });
    try {
      const res = await fetch("/api/narrative", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers: view.session.answers }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.narrative) { setAi({ status: "error", error: data.error ?? "ai_error" }); return; }
      setAi({ status: "ready", narrative: data.narrative, rejected: data.rejected ?? [], show: true });
      try { localStorage.setItem(NARRATIVE_KEY, JSON.stringify({ key: answersKey(view.session), narrative: data.narrative })); } catch { /* 저장 실패는 무시 */ }
    } catch {
      setAi({ status: "error", error: "network" });
    }
  }

  function restart() {
    if (!window.confirm("응답을 모두 지우고 새로 검사할까요? 지금 리포트는 다시 볼 수 없어요.")) return;
    try { localStorage.removeItem(SESSION_KEY); } catch { /* 무시 */ }
    router.push("/survey");
  }

  if (view.kind === "loading") return <main className="main"><p role="status">리포트를 준비하고 있어요.</p></main>;
  if (view.kind === "empty") return <main className="main intro">
    <div className="intro-kicker">SELF-LAYERS</div>
    <h1>아직 볼 수 있는 리포트가 없어요</h1>
    <p className="sub">{view.answered > 0 ? "검사를 끝까지 마치고 제출하면 리포트가 만들어져요. 이어서 해볼까요?" : "76개 문항에 답하면 여섯 개의 Layer로 나를 겹쳐 보는 리포트가 만들어져요."}</p>
    <div className="cta"><a className="btn btn-primary" href="/survey">{view.answered > 0 ? "이어서 하기" : "검사 시작하기"} <span aria-hidden="true">→</span></a></div>
  </main>;

  const date = new Date(view.session.completedAt!).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
  return <>
    <nav className="toc" aria-label="리포트 목차">
      <div className="toc-inner">
        <a className="brand" href="/survey">SELF-LAYERS</a>
        <div className="toc-links">{SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</div>
      </div>
    </nav>
    <div className="report no-print" style={{ paddingBottom: 0 }}>
      <section className="ai-panel" aria-labelledby="ai-title">
        <h2 id="ai-title">AI로 문장 다듬기 <span>선택</span></h2>
        {ai.status === "idle" && <>
          <p>규칙 엔진이 확정한 결과를 바탕으로 요약·Core·두 가지 모드·메시지·교차 해석·편지의 문단을 더 개인화해요. 점수와 판정은 바뀌지 않아요.</p>
          <p className="small">이름과 원래 응답은 보내지 않고, 이 기기에서 계산된 결과 요약만 서버를 거쳐 AI(Anthropic Claude)에 보내요. 검증을 통과하지 못한 문단은 기본 문장을 그대로 둬요.</p>
          <button className="btn btn-primary" onClick={generate}>AI 문장으로 다듬기</button>
        </>}
        {ai.status === "loading" && <p role="status">문장을 쓰고 있어요. 30초에서 1분 정도 걸릴 수 있어요.</p>}
        {ai.status === "error" && <>
          <p role="alert">{AI_ERRORS[ai.error ?? ""] ?? "AI 문장을 만들지 못했어요. 기본 문장은 그대로 볼 수 있어요."}</p>
          {ai.error !== "ai_unavailable" && <button className="btn btn-ghost" onClick={generate}>다시 시도</button>}
        </>}
        {ai.status === "ready" && <>
          <p role="status">{ai.show ? `${Object.keys(ai.narrative).length}개 문단에 AI 문장을 적용했어요. 점선 표시가 있는 문단이에요.` : "기본 문장으로 보고 있어요."}{ai.rejected.length > 0 && ` 검증을 통과하지 못한 ${ai.rejected.length}개 문단은 기본 문장을 유지했어요.`}</p>
          <button className="btn btn-ghost" aria-pressed={ai.show} onClick={() => setAi({ ...ai, show: !ai.show })}>{ai.show ? "기본 문장으로 보기" : "AI 문장으로 보기"}</button>
        </>}
      </section>
    </div>
    <Report result={view.result} name={view.session.name} date={date} narrative={ai.status === "ready" && ai.show ? ai.narrative : undefined} />
    <div className="report" style={{ paddingTop: 0 }}>
      <div className="report-actions no-print">
        <button className="btn btn-ghost" onClick={() => window.print()}>인쇄 · PDF로 저장</button>
        <a className="btn btn-ghost" href="/survey#review">응답 확인·수정</a>
        <button className="btn btn-ghost" onClick={restart}>새로 검사하기</button>
      </div>
    </div>
  </>;
}
