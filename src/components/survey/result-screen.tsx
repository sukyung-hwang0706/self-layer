"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { scoreSurvey } from "../../lib/scoring";
import { buildResultPresentation, intensity } from "../../lib/result-presentation";
import { emptySession, missingQuestions, restoreSession, SESSION_KEY, type SurveySession } from "../../lib/survey-session";
import type { DimensionScore, RankedDimension } from "../../types/result";

const format = (score: number) => Number(score.toFixed(2));

function ScoreBar({ name, score }: { name: string; score: number | null }) {
  return <div className="score-row">
    <div className="score-label"><span>{name}</span><span className="score-details"><strong className="score-value">{score === null ? "산출 보류" : `${format(score)}점`}</strong>{score !== null && <span className="intensity">{intensity(score)}</span>}</span></div>
    {score !== null && <><meter min={0} max={100} value={score} aria-label={`${name} 점수`} /><div className="scale-labels" aria-hidden="true"><span>0</span><span>100</span></div></>}
  </div>;
}

function DimensionBar({ dimension }: { dimension: DimensionScore }) {
  return <div className="dimension-score"><ScoreBar name={dimension.name} score={dimension.score} /></div>;
}

function RankedList({ items }: { items: RankedDimension[] }) {
  return <>{items.map((dimension) => <div className="ranked-score" key={dimension.code}><span className="rank-label">{items.filter((d) => d.rank === dimension.rank).length > 1 ? "공동 " : ""}{dimension.rank}위</span><DimensionBar dimension={dimension} /></div>)}{items.length > 3 && <p className="result-footnote">공동순위가 있어 상위 3위에 해당하는 성향을 모두 표시했어요.</p>}</>;
}

export default function ResultScreen() {
  const router = useRouter();
  const [session, setSession] = useState<SurveySession | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const load = () => {
      let stored = emptySession();
      try { stored = restoreSession(localStorage.getItem(SESSION_KEY)); } catch { /* Unavailable storage has no restorable result. */ }
      if (stored.stage !== "result" || missingQuestions(stored.answers).length) { router.replace("/survey"); return; }
      startTransition(() => setSession(stored));
    };
    load();
    window.addEventListener("pageshow", load);
    window.addEventListener("storage", load);
    return () => { window.removeEventListener("pageshow", load); window.removeEventListener("storage", load); };
  }, [router]);

  function returnToSurvey(restart: boolean) {
    if (!session) return;
    if (restart && !window.confirm("저장된 응답을 모두 지우고 처음부터 시작할까요?")) return;
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(restart ? emptySession() : { ...session, stage: "review" }));
      if (restart) router.replace("/survey"); else router.push("/survey");
    } catch { setError("저장 상태를 변경하지 못했어요. 브라우저의 저장 설정을 확인하고 다시 시도해주세요."); }
  }
  if (!session) return <main className="survey-main"><p className="loading-state" role="status">결과를 불러오고 있어요.</p></main>;
  const score = scoreSurvey(session.answers);
  const { analysis, primary, secondary, layers, sentence } = buildResultPresentation(score);
  return <div className="survey-shell">
    <header className="site-header"><span className="wordmark">SELF<span>—</span>LAYERS<span className="brand-dot">.</span></span><span className="header-caption">나를 이루는 여러 겹</span></header>
    <main className="report-main result-panel">
      <section className="report-intro" aria-labelledby="result-title"><span className="eyebrow">결과 요약 · 108개 응답 완료</span><h1 id="result-title">지금의 나를 살펴보세요.</h1><p className="section-description">하나의 이름으로 담기 어려운 나를 네 개의 Layer로 살펴봅니다. 이 결과는 이번 응답에서 드러난 경향이며, 나를 고정하는 정답은 아니에요.</p><p className="result-footnote">점수는 0~100점의 임시 절대강도입니다. 높다고 좋거나 낮다고 나쁘다는 뜻이 아니며, 백분위나 진단 결과가 아닙니다.</p></section>
      <section className="report-section key-sentence"><span className="eyebrow">01 · 나의 핵심 문장</span><h2>{sentence}</h2><p>중심 성향과 중요하게 여기는 방향을 함께 읽은 문장입니다. 실제 경험과 다른 부분도 천천히 살펴보세요.</p></section>
      <section className="report-section"><h2>네 개 Layer 요약</h2><p className="section-description">각 영역에 속한 차원 점수의 평균이에요. 영역 간 우열을 비교하기보다 각각의 의미를 살펴보세요.</p><div className="layer-grid">{layers.map((layer) => <article className="layer-summary" key={layer.area}><span className="eyebrow">{layer.area}</span><h3>{layer.title}</h3><ScoreBar name="영역 평균" score={layer.score} /><p>{layer.description}</p></article>)}</div><p className="result-footnote">임시 구간: 40점 미만 낮음 · 40~60점 미만 보통 · 60~75점 미만 높음 · 75점 이상 매우 높음. 반올림 전 점수로 구간을 판단합니다.</p></section>
      <section className="report-section"><h2>주요 중심 성향과 보조 성향</h2><h3>{primary.length > 1 ? "함께 나타난 주요 성향 · 공동 1위" : "주요 성향"}</h3>{primary.map((d) => <DimensionBar dimension={d} key={d.code} />)}<h3>보조 성향</h3>{secondary.length ? secondary.map((d) => <DimensionBar dimension={d} key={d.code} />) : <p className="section-description">공동 1위가 있어 하나를 주요 성향, 다른 하나를 보조 성향으로 나누지 않았어요.</p>}</section>
      <section className="report-section core-gap"><h2>가장 높은 두 중심 성향의 점수 차이</h2><p className="gap-value">{analysis.core.topTwoGap === null ? "산출 보류" : `${format(analysis.core.topTwoGap)}점`}</p><p>{analysis.core.isClose ? "두 성향이 근접하게 나타났어요. 점수 차이가 5점 미만이므로 두 성향을 함께 살펴보세요." : "점수 차이가 5점 이상이에요. 더 두드러진 성향과 함께 보조 성향도 살펴보세요."}</p>{primary.length > 1 && <p className="result-footnote">공동 1위 사이의 차이는 0점입니다. 동점인 성향에 임의로 우선순위를 부여하지 않았어요.</p>}</section>
      <section className="report-section"><h2>관계 변화 민감도</h2><DimensionBar dimension={analysis.relationship.ANX} /><p className="section-description">가까운 사람의 반응이나 관계의 변화 신호를 감지하고 확인하려는 경향입니다. 점수만으로 관계가 끊어질 것이라는 믿음까지 단정하지 않아요.</p></section>
      <section className="report-section"><h2>친밀감 거리두기</h2><DimensionBar dimension={analysis.relationship.AVO} /><p className="section-description">정서적 친밀감이나 의존이 커질 때 거리를 확보하려는 경향입니다. 관계 변화 민감도와는 별개로 읽으며, 두 점수를 하나의 관계 유형으로 묶지 않아요.</p></section>
      <section className="report-section"><h2>주요 반복 패턴</h2><p className="section-description">반복되는 내면의 규칙 중 점수가 높은 상위 3위입니다. 60점 미만의 패턴은 강하게 나타난 대표 패턴으로 단정하지 않아요.</p><RankedList items={analysis.pattern.top} /></section>
      <section className="report-section"><h2>내가 향하는 주요 방향</h2><p className="section-description">삶의 선택에서 중요하게 여기는 가치 중 상위 3위입니다. 다른 가치가 중요하지 않다는 뜻은 아니에요.</p><RankedList items={analysis.direction.top} /></section>
      <section className="report-section quality-note"><h2>응답 품질 안내</h2>{score.quality.warnings.length ? <><p>다음 응답 경향이 확인되었어요. 점수를 무효 처리하거나 변경하지 않았습니다.</p>{score.quality.warnings.includes("uniform-responses") && <p>같은 응답이 전체의 90% 이상이에요. 각 문항을 충분히 구분해 답했는지 돌아보세요.</p>}{score.quality.warnings.includes("extreme-responses") && <p>1점 또는 5점 응답이 전체의 90% 이상이에요. 응답이 평소 모습을 담고 있는지 살펴보세요.</p>}</> : <p>동일 응답 또는 1·5점 응답이 90% 이상인 경향은 확인되지 않았어요. 이 안내만으로 응답의 정확성을 보장하지는 않습니다.</p>}<p>108개 문항에 모두 답했어요.</p></section>
      <section className="report-section"><h2>나의 속도로 다시 살펴보기</h2><p className="section-description">응답을 확인하거나, 지금의 나를 떠올리며 처음부터 다시 시작할 수 있어요.</p><div className="result-actions"><button className="secondary-button" onClick={() => returnToSurvey(false)}>응답 다시 살펴보기</button><button className="primary-button" onClick={() => returnToSurvey(true)}>다시 검사하기</button></div>{error && <p role="alert" className="live-notice">{error}</p>}</section>
    </main><footer className="site-footer"><span>SELF-LAYERS</span><span>하나의 유형보다, 나를 이루는 여러 겹.</span></footer>
  </div>;
}
