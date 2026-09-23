import type { ReactNode } from "react";
import {
  ATTACHMENT_LABEL, CHANNEL_CONTENT, CORE, COPING, DISCLAIMER, MESSAGES, RELATIONSHIP, SCHEMAS, SOURCE_NOTE, STATE_BANDS, STATE_PARTS, TRIGGERS, VALUES,
} from "../../data/content";
import { PART2 } from "../../data/items";
import { band, coreName, coreSentence, fillText, linkedLabel, quadrant, r, selfMapAxes, strengthWord, valueLife } from "../../lib/report";
import { rankBy } from "../../lib/scoring";
import { COPING_CODES, CORE_TYPES, TRIGGER_CODES, type AssessmentResult, type CoreType } from "../../types/assessment";
import type { Narrative, NarrativeField } from "../../lib/narrative";
import { BarList, Figure, ModesBar, Quadrant, Radar, StateGauge, Venn } from "./charts";

export const SECTIONS = [
  ["summary", "요약"], ["map", "Self Map"], ["core", "Core"], ["influence", "보조 Core"], ["state", "지금의 나"], ["modes", "두 가지 모드"],
  ["message", "메시지"], ["relationship", "관계"], ["pattern", "패턴"], ["stress", "스트레스"], ["direction", "가치"], ["cross", "교차 해석"], ["growth", "성장"], ["letter", "편지"],
] as const;

function Page({ id, layer, kicker, children, className = "" }: { id?: string; layer: string; kicker: string; children: ReactNode; className?: string }) {
  return <section id={id} className={`page ${layer} ${className}`} aria-labelledby={id ? `${id}-title` : undefined}>
    <div className="kicker">{kicker}</div>
    {children}
  </section>;
}

export interface ReportProps { result: AssessmentResult; name: string; date: string; narrative?: Narrative }

export default function Report({ result, name, date, narrative }: ReportProps) {
  const nm = name ? `${name}님` : "당신";
  const { core, state, modes, message, stress, values, attachment, schemas, schemaRanking, insights } = result;
  const P = core.primary, S = core.secondary;
  const pc = CORE[P], sc = CORE[S];
  const f = (text: string) => fillText(text, { nm, primary: pc.name });
  /** 검증을 통과한 AI 문단이 있으면 기본 문장 대신 보여준다. */
  const ai = (field: NarrativeField, fallback: ReactNode, className = "") => narrative?.[field]
    ? <p className={`ai-text ${className}`} data-ai={field}>{f(narrative[field]!)}</p>
    : fallback;
  const stateBand = STATE_BANDS[state.band];
  const top3 = values.top3;
  const q = quadrant(attachment.ANX, attachment.AVO);
  const rel = RELATIONSHIP[q];

  return <article className="report">
    {/* 00 표지 */}
    <section className="page cover l-cross" aria-label="표지">
      <div className="brand-line">SELF-LAYERS</div>
      <h1>나를 이루는<br />여러 겹의 이야기</h1>
      <div className="sub">DEEP SELF-UNDERSTANDING REPORT · V1.0</div>
      <div className="form">
        <div><span>이름</span><b>{name || "—"}</b></div>
        <div><span>검사일</span><b>{date}</b></div>
        <div><span>문항</span><b>76문항 · 6 Part</b></div>
      </div>
      <p className="epi">“당신을 이해하는 목적은 더 나은 사람이 되기 위해서만은 아닙니다.<br />때로는 지금까지의 나를 조금 덜 오해하기 위해서이기도 합니다.”</p>
      <p className="disclaimer" style={{ marginTop: 36 }}>{DISCLAIMER}</p>
    </section>

    {/* 01 소개 */}
    <Page layer="l-cross" kicker="SELF-LAYERS는 어떤 검사인가요">
      <h2>한 사람을 하나의 이름으로 부르지 않아요</h2>
      <p className="lead">누군가를 이해하고 싶을 때 우리는 종종 이름 하나를 붙여요. 이런 말은 나를 빠르게 설명해주지만, 한편으로는 한 사람을 지나치게 단순하게 만들기도 해요. 같은 행동이라도 그 안에서 움직이는 마음은 사람마다 다르거든요.</p>
      <p>SELF-LAYERS는 그 “안에서 움직이는 마음”을 여섯 겹으로 나누어 봐요. 그리고 각 Layer의 점수보다 “서로 어떻게 연결되는가”를 더 중요하게 봐요. 같은 방향으로 겹치는 특성은 더 선명하게, 흔한 설명이 다른 결과에서 뒷받침되지 않으면 그 설명은 약하게 쓰거나 쓰지 않아요.</p>
      <div className="grid3">
        <div className="cell l-core"><b>CORE · 나를 움직이는 힘</b>무엇을 얻고 싶어서, 무엇을 잃을까 봐 그렇게 선택하는지를 봐요.</div>
        <div className="cell l-state"><b>STATE · 요즘의 나</b>지난 한 달, 마음의 여유가 얼마나 있었는지를 봐요. 성격이 아니라 계절이에요.</div>
        <div className="cell l-rel"><b>RELATIONSHIP · 관계 속의 나</b>가까움과 거리, 상대의 변화에 어떻게 반응하는지 봐요.</div>
        <div className="cell l-pat"><b>PATTERN · 반복하는 습관</b>압박 속에서 익숙하게 반복되는 생각의 규칙을 봐요.</div>
        <div className="cell l-str"><b>STRESS · 나를 흔드는 것</b>어떤 상황에서 흔들리고, 그때 무엇을 하며, 얼마나 빨리 돌아오는지를 봐요.</div>
        <div className="cell l-dir"><b>DIRECTION · 내가 향하는 곳</b>여러 상황에서 반복해 고른 삶의 기준을 읽어요.</div>
      </div>
      <div className="grid3">
        <div className="cell"><b>점수는 강도예요</b>0~100은 그 경향이 응답에서 얼마나 강하게 나타났는지예요. 다른 사람보다 상위 몇 %라는 뜻이 아니에요.</div>
        <div className="cell"><b>높다고 좋거나 나쁘지 않아요</b>어떤 특성은 강점이 되면서 동시에 피로의 원인이 되기도 해요.</div>
        <div className="cell"><b>지금의 경향이에요</b>환경과 관계, 역할에 따라 같은 특성도 다르게 쓰여요. 실제 경험과 다른 부분이 있다면 그 차이도 중요한 정보예요.</div>
      </div>
      <div className="note"><b>읽는 동안 기억해둘 세 가지 질문</b>이 모습은 언제 나에게 힘이 되는가? · 같은 방식이 언제부터 나를 힘들게 하는가? · 다음에는 다른 선택도 가능할까?</div>
    </Page>

    {/* 02 한 사람으로 읽기 */}
    <Page id="summary" layer="l-cross" kicker="당신을 먼저 한 사람으로 읽어보았습니다">
      <h2 id="summary-title">{pc.essence}</h2>
      <p className="lead">{coreSentence(result, nm)} {f(pc.intro)}</p>
      {ai("summary", <><p>그리고 마음 안에는 또 하나의 큰 힘이 있어요. {f(sc.secondaryNote)}{core.strongSecondary && " 동기 진술에서도 이 마음이 강하게 나타나, 보조 Core로 함께 읽어요."}</p>
      <p>{state.band === "expansion" ? `이번 결과에서 특히 눈에 띄는 건, 요즘의 ${nm}이 꽤 여유 있는 자리에 서 있다는 거예요. 그래서 이 리포트는 “무엇이 문제인가”보다 “힘이 지금 어떻게 잘 쓰이고 있고, 어디서 조금 더 자유로워질 수 있는가”를 따라가요.`
        : state.band === "balanced" ? `요즘의 ${nm}은 평소의 자리에 있어요. 상황에 따라 여유와 긴장 사이를 오가는 시기라, 이 리포트는 무엇이 여유 쪽으로 옮겨주는지에 주목해요.`
        : `요즘의 ${nm}은 마음의 여유가 많이 줄어든 자리에 있어요. 그래서 이 리포트는 무언가를 더 하라는 제안보다, 지금의 익숙한 방식이 어떻게 나를 지키고 있는지를 알아차리는 데 초점을 맞춰요.`}</p></>)}
      <div className="quote">{nm}은 여러 상황에서 {top3.map((v) => VALUES[v].name).join(" · ")}의 방향을 반복해서 골라왔어요. 이 리포트는 {pc.name}의 마음이 이 기준들과 어디서 서로를 돕고, 어디서 부딪히는지를 함께 살펴봐요.</div>
      {core.weakMotive && <p className="flag">선택 문항에서는 {pc.name}에 가깝게 나타났지만, 동기 진술에서는 그 마음이 강하게 드러나지 않았어요. 그래서 이 리포트는 단정하는 문장을 줄였어요.</p>}
      {result.consistency.flag && <p className="flag">서로 반대되는 뜻의 문장 몇 쌍에 같은 방향으로 답한 경우가 있었어요. 문항을 다르게 읽었을 수 있어서, 해석을 조금 더 조심스럽게 했어요.</p>}
    </Page>

    {/* 03 Self Map */}
    <Page id="map" layer="l-cross" kicker="나를 이루는 여섯 개의 Layer">
      <h2 id="map-title">My Self Map</h2>
      <p className="lead">여섯 개의 Layer에서 {nm}을 가장 잘 설명하는 값을 하나씩 모아 한 장에 그렸어요. 숫자보다 각 꼭짓점에 무엇이 발견됐는지를 먼저 읽어주세요.</p>
      {(() => {
        const axes = selfMapAxes(result);
        return <Figure caption="바깥 선이 100, 안쪽으로 75 · 50 · 25 구간이에요. 점수는 서로 다른 것을 재기 때문에 크기를 직접 비교하기보다 모양으로 읽어주세요.">
          <Radar ariaLabel="여섯 Layer 요약 레이더 차트" color="var(--core)" axes={axes.map((a) => ({ key: a.layer, label: a.caption, score: a.score, layer: a.layer }))} />
          <div className="grid2" style={{ margin: "14px 0 0" }}>
            {axes.map((a) => <div key={a.layer} className={`cell l-${a.layer}`}><b>{a.caption}</b>{a.label} · {r(a.score)}</div>)}
          </div>
        </Figure>;
      })()}
      <p>이 여섯 가지는 따로 노는 성격표가 아니에요. 어떤 순간에는 CORE가 앞에 서고, 어떤 순간에는 관계의 안전이나 오래된 습관이 결정권을 가져가요. 중요한 건 “무엇이 높은가”보다 상황에 따라 어느 Layer가 마지막 결정을 맡는가예요.</p>
      <div className="note"><b>Key connection</b>{pc.name}의 {pc.seeks} ↔ {sc.name}의 {sc.seeks}. 두 마음이 같은 방향을 볼 때 힘은 더 선명해지고, 서로 다른 말을 할 때는 그 사이의 긴장 자체가 중요한 이야기가 돼요. {state.band === "expansion" ? "여유가 있는 지금은 그 힘이 유연하게 쓰이고 있어요." : state.band === "balanced" ? "지금은 상황에 따라 두 마음 중 하나가 앞에 서요." : "지금은 익숙한 쪽 하나에 기대기 쉬운 시기예요."}</div>
    </Page>

    {/* 04 Core */}
    <Page id="core" layer="l-core" kicker="CORE · 무엇이 나를 움직이는가">
      <h2 id="core-title">My Core · {pc.name}<span className="h2-sub">{pc.title}</span></h2>
      <Figure title="상황선택 18문항에서 쌓인 점수" caption="이 힘들은 누구에게나 조금씩 있어요. 이 표는 그중 어떤 힘이 선택을 가장 자주 움직였는지를 보여줘요. 상황선택형 문항이라 점수는 상대적인 비중이에요.">
        <div className="core-grid">
          {CORE_TYPES.map((t) => <div key={t} className={`core-tile${t === P ? " pri" : t === S ? " sec" : ""}`}>
            <div className="nm">{CORE[t].name}</div><div className="sc">{r(core.typeScore[t])}</div>
            <div className="tag">{t === P ? "MY CORE" : t === S ? "보조 Core" : t === core.influence.type ? "Influence" : ""}</div>
          </div>)}
        </div>
        <BarList label="Core 점수 순위" rows={core.ranking.map((t, i) => ({ name: CORE[t].name, value: core.typeScore[t], strong: i === 0, muted: i > 2 }))} />
        <p className="small" style={{ marginTop: 12 }}>{(() => {
          const m = rankBy(CORE_TYPES, core.motive);
          return `동기 진술(9문항)에서는 ${CORE[m[0]].name} ${r(core.motive[m[0]])} · ${CORE[m[1]].name} ${r(core.motive[m[1]])} 순으로 높았어요. ${m[0] === P ? "선택과 같은 방향이에요." : `${pc.name}의 동기 진술은 ${r(core.motive[P])}였어요.`}`;
        })()}</p>
      </Figure>
      <p className="lead">{f(pc.body)}</p>
      <p>{f(pc.tension)}</p>
      <div className="grid3">
        <div className="cell"><b>내가 원하는 것</b>{pc.wants}</div>
        <div className="cell"><b>민감해지는 것</b>{pc.sensitive}</div>
        <div className="cell"><b>내가 가진 힘</b>{pc.strengths}</div>
      </div>
      <h3>행동 뒤에 숨어 있는 이유</h3>
      {ai("core", (() => {
        const [m1, m2] = rankBy(CORE_TYPES, core.motive);
        const text = (t: CoreType) => PART2.find((i) => i.code === t)!.text.replace(/\.$/, "");
        return core.motive[m1] >= 50
          ? <p>동기 진술에서 가장 높게 나온 문장은 “{text(m1)}”였어요({r(core.motive[m1])}). {core.motive[m2] >= 50 && <>그 다음이 “{text(m2)}”였고요({r(core.motive[m2])}). </>}행동은 “무엇을 하는가”를, 동기 진술은 “무엇을 잃을까 봐 그렇게 하는가”를 보여줘요. 두 가지를 겹쳐 보면 선택 뒤에 있는 마음이 조금 더 또렷해져요.</p>
          : <p>동기 진술에서는 특별히 강하게 나온 문장이 없었어요. 행동의 선택은 분명한데 그 이유를 한 문장으로 붙잡기는 어려운 상태일 수 있어요. 그래서 이 리포트의 Core 설명은 “이유”보다 “행동의 경향”으로 읽어주세요.</p>;
      })())}
      <div className="grid3 l-dir">
        {top3.map((v) => <div key={v} className="cell"><b>{VALUES[v].name} · {r(values.score[v])}</b>{VALUES[v].question}</div>)}
      </div>
      <h3>힘이 가장 잘 나오는 자리 · {CHANNEL_CONTENT[core.channel.primary].name}</h3>
      <p>하루를 잘 보냈다는 느낌이 언제 오는지 물었을 때 “{CHANNEL_CONTENT[core.channel.primary].choice}”를 첫 번째로 골랐어요. {CHANNEL_CONTENT[core.channel.primary].text}</p>
      <div className="quote">{pc.question}</div>
    </Page>

    {/* 05 Influence · 보조 Core */}
    <Page id="influence" layer="l-core" kicker="CORE · 같은 힘이라도 사용하는 방식은 다릅니다">
      <h2 id="influence-title">{core.influence.type ? `${CORE[core.influence.type].name} Influence` : "뚜렷한 Influence 없음"},<br />보조 Core는 {sc.name}</h2>
      <Figure title={`${pc.name} 곁에서 함께 움직이는 힘`}>
        <div className="core-grid">
          {[core.influence.candidates[0], P, core.influence.candidates[1]].map((t) => <div key={t} className={`core-tile${t === P ? " pri" : t === core.influence.type ? " sec" : ""}`}>
            <div className="nm">{CORE[t].name}</div><div className="sc">{r(core.typeScore[t])}</div><div className="tag">{t === P ? "MY CORE" : t === core.influence.type ? "Influence" : ""}</div>
          </div>)}
        </div>
      </Figure>
      {core.influence.type
        ? <p className="lead">같은 {pc.name}여도 곁의 힘에 따라 모습이 꽤 달라요. {pc.name} 곁의 두 힘 중 {CORE[core.influence.type].name}이 더 높게 나왔어요. {CORE[core.influence.type].influenceNote}</p>
        : <p className="lead">{pc.name} 곁의 두 힘이 같은 점수로 나와, 한쪽으로 기운 Influence는 보이지 않았어요. 상황에 따라 두 결을 모두 꺼내 쓰는 편일 수 있어요.</p>}
      <h3>보조 Core · {sc.name} — {sc.title}</h3>
      <p>보조 Core는 {sc.name}({r(core.typeScore[S])})예요. {f(sc.secondaryNote)} {core.strongSecondary ? "동기 진술에서도 이 마음이 강하게 나와, 단순한 “두 번째”가 아니라 함께 움직이는 힘으로 읽어요." : "다만 동기 진술에서는 주된 힘만큼 강하지 않아, 상황에 따라 꺼내 쓰는 보조적인 결로 읽어요."}</p>
      <div className="grid2">
        <div className="cell"><b>{pc.name}의 힘</b>{pc.strengths}</div>
        <div className="cell"><b>{sc.name}의 힘</b>{sc.strengths}</div>
      </div>
      {core.status === "undetermined" && <p className="flag">{[P, ...core.tiedWith].map(coreName).join(" · ")}가 선택·동기 진술·1순위 횟수에서 모두 같은 무게로 나왔어요. 한 가지로 판정하지 않고, 이 리포트는 {pc.name}을 기준으로 쓰되 다른 힘의 설명도 함께 참고하길 권해요.</p>}
      <p className="small">※ Influence와 보조 Core는 18개 상황선택 문항과 9개 동기 진술에서 파생된 참고 지표이며, 별도의 전용 측정으로 보지 않습니다.</p>
    </Page>

    {/* 06 STATE */}
    <Page id="state" layer="l-state" kicker="STATE · 지금 나는 어디에 있는가">
      <h2 id="state-title">지난 한 달의 나 · {stateBand.label}</h2>
      <p className="lead">이 페이지는 “어떤 사람인가”가 아니라 “요즘 어떤 상태인가”를 봐요. 같은 사람도 여유가 있을 때와 없을 때 전혀 다른 선택을 하니까요. 그래서 여기서만큼은 “지난 한 달 동안”을 기준으로 물었어요.</p>
      {(() => {
        const parts = STATE_PARTS.map((p) => ({ label: p.label, value: p.key === "selfCompassion" ? state.selfCompassion : p.key === "flexibility" ? state.flexibility : state.needs[p.key] }));
        const hi = [...parts].sort((a, b) => b.value - a.value)[0], lo = [...parts].sort((a, b) => a.value - b.value)[0];
        return <>
          <Figure caption={`다섯 요소 중 “${hi.label}”이 가장 높고, “${lo.label}”이 가장 낮아요.`}>
            <StateGauge value={state.index} />
            <div className="fig-title" style={{ marginTop: 14 }}>무엇으로 이루어졌나</div>
            <BarList label="현재 상태 구성 요소" rows={parts.map((p) => ({ name: p.label, value: p.value, strong: p === hi }))} />
          </Figure>
          <div className="note"><b>지금의 위치 · {stateBand.label}</b>{stateBand.note}</div>
          <p>한 가지만 기억해두면 좋겠어요. 이 상태는 성격이 아니라 계절 같은 거예요. 다음 달에 다시 재면 달라질 수 있어요. 힘든 시기가 오면 이 페이지로 돌아와 “{lo.label}”처럼 가장 낮은 요소가 무엇인지 보세요. 무엇부터 채워야 하는지 힌트가 될 거예요.</p>
        </>;
      })()}
    </Page>

    {/* 07 Two modes */}
    <Page id="modes" layer="l-state" kicker="STATE · 건강할 때의 나, 스트레스받을 때의 나">
      <h2 id="modes-title">My Two Modes</h2>
      <p className="lead">같은 사람도 마음의 자원이 충분할 때와 부족할 때는 다른 선택지를 갖게 돼요. SELF-LAYERS는 이걸 “다른 사람으로 변한다”가 아니라 “접근할 수 있는 선택지가 넓어지거나 좁아진다”로 봐요.</p>
      <Figure caption={modes.expansionBand === "high" && modes.protectionBand === "high" ? "두 지수가 모두 높아요. 지금은 양쪽을 오가는 시기일 수 있어요." : "두 지수는 서로 독립이에요. 더 긴 쪽의 모습이 지금 조금 더 가까울 수 있어요."}>
        <ModesBar protection={modes.protection} expansion={modes.expansion} />
      </Figure>
      {narrative?.modes && <p className="ai-text" data-ai="modes">{f(narrative.modes)}</p>}
      {(() => {
        const healthy = <div key="h">
          <h3>건강할 때의 나 — {modes.expansionBand === "high" ? "지금 가까운 모습" : modes.expansionBand === "mid" ? "상황에 따라 오가는 모습" : "여유가 생기면 돌아오는 모습"}</h3>
          <p>{pc.healthy.text}</p>
          <div className="grid3">{pc.healthy.cells.map((c) => <div key={c.title} className="cell"><b>{c.title}</b>{c.text}</div>)}</div>
          <p>이번 결과에서 Expansion 지수는 {r(modes.expansion)}예요. {modes.expansionBand === "high" ? "지금은 이 모습에 상당히 가까이 와 있어요. 그래서 이 리포트의 제안은 “고치기”보다 “이미 하고 있는 걸 더 자주 하기”에 가까워요." : modes.expansionBand === "mid" ? "상황에 따라 이 모습과 평소의 모습을 오가고 있어요. 어떤 조건에서 이 모습이 나오는지 알아두면, 그 조건을 조금 더 자주 만들 수 있어요." : "지금은 이 모습을 꺼낼 여유가 많지 않은 시기예요. 이 설명은 목표가 아니라, 여유가 생겼을 때 돌아올 수 있는 방향으로 읽어주세요."}</p>
          <div className="quote">{pc.healthy.quote}</div>
        </div>;
        const stressed = <div key="s">
          <h3>스트레스받을 때의 나 — {modes.protectionBand === "high" ? "지금 가까울 수 있는 모습" : modes.protectionBand === "mid" ? "부분적으로 켜져 있는 모습" : "여유가 줄어들면 나타날 수 있는 모습"}</h3>
          <p>{pc.stress.text}</p>
          <div className="grid3">{pc.stress.signals.map((s, i) => <div key={s} className="cell l-str"><b>신호 0{i + 1}</b>{s}</div>)}</div>
          <p>이번 결과에서 Protection 지수는 {r(modes.protection)}예요. {modes.protectionBand === "high" ? "지금은 이 모드가 꽤 켜져 있을 수 있어요. 스스로를 탓하기보다, 지금 이 방식이 나를 지키려고 애쓰고 있다는 걸 먼저 알아차려주세요." : modes.protectionBand === "mid" ? "부분적으로 켜져 있어요. 힘든 일이 겹치는 날에 이 모습이 더 자주 보일 수 있어요." : "지금은 이 모드가 거의 켜져 있지 않아요. 그래서 이 설명은 “지금의 나”가 아니라 “힘든 시기가 왔을 때 알아차릴 신호”로 읽어주세요."} 이 모드에서 흔히 켜지는 대처는 “{COPING[modes.protectionCoping].name}”이고, 이번 응답에서는 {r(stress.coping[modes.protectionCoping])}로 나타났어요.</p>
          <div className="note l-str"><b>알아차림 포인트</b>{pc.stress.note}</div>
        </div>;
        return modes.protectionBand === "high" && modes.expansionBand !== "high" ? [stressed, healthy] : [healthy, stressed];
      })()}
    </Page>

    {/* 08 Message */}
    <Page id="message" layer="l-cross" kicker="내가 오래 확인하고 싶었던 말">
      <h2 id="message-title">The Message I Seek</h2>
      <div className="quote big l-core">“{MESSAGES[message.rank1].text}”</div>
      {message.rank2 && <div className="quote big l-core" style={{ opacity: .85 }}>“{MESSAGES[message.rank2].text}”</div>}
      {ai("message", <p className="lead">{message.rank2
        ? `위의 두 문장을 천천히 한 번씩 읽어보세요. 둘 중 어느 쪽에서 마음이 조금 더 오래 멈추나요. 이번 결과에서는 두 문장이 거의 같은 무게로 나왔어요. 하나는 ${CORE[message.rank1].seeks}이 오래 기다려온 말이고, 다른 하나는 ${CORE[message.rank2].seeks}이 기다려온 말이에요.`
        : `이 문장을 천천히 한 번 읽어보세요. 이 말은 ${CORE[message.rank1].seeks}이 오래 기다려온 말일 수 있어요.`}</p>, "lead")}
      <p>이 문장을 보고 어린 시절을 떠올려도 괜찮고, 떠오르지 않아도 괜찮아요. SELF-LAYERS는 이 말을 과거의 어떤 사건이나 결핍 때문이라고 설명하지 않아요. 그보다는 “지금의 내가 어떤 조건이 채워져야 마음 놓고 나를 괜찮다고 여기는가”를 알아차리기 위한 문장으로 써요. 읽다가 마음이 멈추는 곳이 있다면, 그게 이 페이지가 하고 싶은 이야기의 전부예요.</p>
      {!message.coreMatch && <div className="note"><b>행동과 기다림이 서로 다른 곳을 가리킬 때</b>선택에서 가장 자주 나타난 힘은 {pc.name}였지만, 가장 오래 기다린 말은 {CORE[message.rank1].name}의 것이었어요. 행동은 한쪽을 향하지만, 마음이 확인받고 싶은 자리는 조금 다른 곳에 있을 수 있어요.</div>}
      <div className="note"><b>이 말을 나의 문장으로 다시 써보면</b>“{MESSAGES[message.rank1].rewrite}”<br /><span className="small">이 문장이 마음에 들지 않으면 {nm}의 말로 고쳐 써도 좋아요. 그게 이 페이지의 목적이에요.</span></div>
      <p className="small">이 페이지는 자기성찰을 위한 가설적 언어입니다. 실제 성장환경이나 가족관계를 추정하지 않습니다.</p>
    </Page>

    {/* 09 Relationship */}
    <Page id="relationship" layer="l-rel" kicker="RELATIONSHIP · 관계 속의 나">
      <h2 id="relationship-title">{rel.title}</h2>
      <Figure caption={`왼쪽으로 갈수록 가까워지는 게 편하고, 위로 갈수록 상대의 변화에 예민해져요. 지금 위치는 “${rel.label}” 쪽이에요.`}>
        <Quadrant anx={attachment.ANX} avo={attachment.AVO} labels={[RELATIONSHIP.closeWatch.label, RELATIONSHIP.distWatch.label, RELATIONSHIP.closeCalm.label, RELATIONSHIP.distCalm.label]} />
        <div style={{ marginTop: 14 }}><BarList label="관계 두 축의 점수" rows={[{ name: ATTACHMENT_LABEL.ANX, value: attachment.ANX }, { name: ATTACHMENT_LABEL.AVO, value: attachment.AVO }]} /></div>
      </Figure>
      <p className="lead">{rel.lead}</p>
      <div className="grid3">{rel.cells.map((c) => <div key={c.title} className="cell"><b>{c.title}</b>{c.text}</div>)}</div>
      <div className="note"><b>관계에서의 핵심</b>{rel.note}</div>
      <p className="small">두 축은 서로 독립적으로 읽어요. 하나의 관계 유형으로 합치지 않아요.</p>
      <h3>관계에서 마음이 흔들리는 순간</h3>
      {(() => {
        const notes = (["ABN", "ED"] as const).filter((k) => schemas[k] >= 60);
        return notes.length
          ? notes.map((k) => <div key={k} className="note"><b>{SCHEMAS[k].name} · {r(schemas[k])}</b>{SCHEMAS[k].text} {SCHEMAS[k].signal}</div>)
          : <p>관계가 멀어질까 하는 걱정이나 이해받지 못할 거라는 기대는 두드러지지 않았어요({SCHEMAS.ABN.name} {r(schemas.ABN)} · {SCHEMAS.ED.name} {r(schemas.ED)}). 관계에서 크게 흔들리는 지점보다는, 위의 반응 방식이 일상의 관계를 더 많이 설명해줄 거예요.</p>;
      })()}
    </Page>

    {/* 10 Pattern */}
    <Page id="pattern" layer="l-pat" kicker="PATTERN · 반복되는 내면의 규칙">
      <h2 id="pattern-title">{schemaRanking.slice(0, 3).map((k) => SCHEMAS[k].name).join(" · ")}</h2>
      {(() => {
        const high = schemaRanking.filter((k) => schemas[k] >= 60);
        return <Figure caption={high.length ? `“다소 높음” 이상 구간에 들어온 규칙은 ${high.length}개예요.` : "모든 규칙이 중간 이하에 머물러, 내면 규칙이 비교적 유연하게 작동하고 있어요."}>
          <BarList bands label="여덟 가지 내면 규칙 점수" rows={schemaRanking.map((k, i) => ({ name: SCHEMAS[k].name, value: schemas[k], strong: i < 3, muted: i >= 3 }))} />
        </Figure>;
      })()}
      <p className="lead">패턴은 결함이 아니라 오래 사용해온 내면의 규칙이에요. 같은 규칙이 여유가 있을 때는 배려와 신중함이 되고, 압박이 커지면 자기희생과 과도한 경계가 될 수 있어요. 중요한 건 점수의 높낮이보다 “언제 이 규칙이 나를 돕고, 언제 내 선택권을 줄이는가”예요.</p>
      {(() => {
        const [a, b, c] = schemaRanking;
        return <>
          <h3>가장 강하게 나타난 규칙 · {SCHEMAS[a].name} · {r(schemas[a])}</h3>
          <div className="quote">{SCHEMAS[a].quote}</div>
          <p>{SCHEMAS[a].text}{schemas[a] < 60 && " 다만 이번 결과에서는 중간 정도라, 늘 작동하기보다는 특정 상황에서 가끔 고개를 드는 규칙에 가까워요."}</p>
          <div className="grid2">
            <div className="cell"><b>이 규칙이 만들어주는 힘</b>{SCHEMAS[a].strength}</div>
            <div className="cell"><b>이 규칙이 나를 지치게 할 때</b>{SCHEMAS[a].cost}</div>
          </div>
          <div className="note"><b>알아차릴 신호</b>{SCHEMAS[a].signal}</div>
          <h3>함께 움직이는 두 번째와 세 번째 규칙</h3>
          <div className="grid2">
            {[b, c].map((k) => <div key={k} className="cell"><b>{SCHEMAS[k].name} · {r(schemas[k])} · {band(schemas[k])}</b>{SCHEMAS[k].text}</div>)}
          </div>
        </>;
      })()}
      <p className="small">내면 규칙은 개념당 두 문항으로 재기 때문에, 점수 하나하나의 크기보다 “어느 방향이 앞에 있는가”로 읽어주세요.</p>
    </Page>

    {/* 11 Stress */}
    <Page id="stress" layer="l-str" kicker="STRESS · 나를 흔드는 순간과 그때의 나">
      <h2 id="stress-title">My Stress Signature</h2>
      <Figure caption={stress.vulnerable.length ? `점선(65) 바깥으로 나간 상황이 크게 흔들리는 지점이에요.` : "여섯 상황 모두 점선(65) 안쪽에 머물러 있어요."}>
        <Radar ariaLabel="여섯 가지 스트레스 상황별 흔들림 강도" color="var(--str)" threshold={65} axes={TRIGGER_CODES.map((k) => ({ key: k, label: TRIGGERS[k].label, score: stress.triggers[k] }))} />
        <div className="grid2" style={{ margin: "10px 0 0" }}>
          <div>
            <div className="fig-title">힘들 때 나는</div>
            <BarList label="대처 방식 점수" rows={rankBy(COPING_CODES, stress.coping).map((k) => ({ name: COPING[k].name, value: stress.coping[k], strong: stress.dominantCoping.includes(k), muted: !stress.dominantCoping.includes(k) }))} />
          </div>
          <div className="l-state">
            <div className="fig-title">흔들린 뒤 돌아오는 속도</div>
            <BarList label="정서 반응성" rows={[{ name: "반응성", value: stress.reactivity }]} />
            <p className="small" style={{ marginTop: 8 }}>낮을수록 빨리 회복해요.</p>
          </div>
        </div>
      </Figure>
      {stress.vulnerable.length === 0 ? <>
        <p className="lead">좋은 소식부터요. 여섯 가지 상황 중 어느 것도 “크게 흔들린다”는 기준을 넘지 않았어요. 뚜렷한 취약점은 보이지 않아요. {stress.reactivityBand === "low" ? "한번 흔들려도 원래 상태로 돌아오는 속도도 빠른 편이에요." : ""}</p>
        <p>그래도 상대적으로 조금 더 마음이 쓰이는 곳은 “{TRIGGERS[rankBy(TRIGGER_CODES, stress.triggers)[0]].label}”이에요. 취약점이라기보다, 힘들어질 때 어디서부터 시작되는지를 알려주는 주의 지점으로 읽어주세요.</p>
      </> : <>
        <p className="lead">{nm}을 크게 흔드는 상황은 {stress.vulnerable.map((k) => `“${TRIGGERS[k].label}”`).join("와 ")}예요. 이 지점은 약점이 아니라, 무엇이 중요한 사람인지를 거꾸로 보여주는 지도이기도 해요.</p>
        <div className="grid2">{stress.vulnerable.map((k) => <div key={k} className="cell"><b>{TRIGGERS[k].label} · {r(stress.triggers[k])}</b>{TRIGGERS[k].text}</div>)}</div>
        {stress.coreMatch === true && <p>이 흔들림은 {pc.name}에게서 흔히 보이는 지점과 같은 방향이에요. {pc.name}의 마음이 중요하게 여기는 것이 위협받을 때 크게 반응한다는 뜻이에요.</p>}
        {stress.coreMatch === false && <div className="note"><b>전형과 다른 지점</b>흥미롭게도 이 지점은 {pc.name}에게서 전형적으로 보이는 취약점과는 다른 곳이에요. 유형의 설명보다 지금의 환경이나 역할, 요즘의 관계가 더 크게 작용하고 있을 수 있어요.</div>}
      </>}
      <p>흔들린 뒤 돌아오는 속도는 {stress.reactivityBand === "high" ? "느린 편이에요. 한번 마음이 흔들리면 원래 상태로 돌아오는 데 시간이 걸릴 수 있어요. 흔들림 자체를 줄이려 하기보다, 회복을 돕는 자신만의 방법을 미리 알아두면 좋아요." : stress.reactivityBand === "mid" ? "보통이에요. 크게 흔들리는 날도, 금방 돌아오는 날도 있어요." : "빠른 편이에요. 흔들려도 비교적 금방 원래 자리로 돌아와요."}</p>
      <h3>힘들 때 나는 — {stress.dominantCoping.map((k) => COPING[k].name).join(" · ")}</h3>
      {stress.dominantCoping.map((k) => <p key={k}>{COPING[k].text}</p>)}
      {attachment.ANX >= 60 && stress.dominantCoping.includes("SC3") && <div className="note"><b>관계와 함께 보면</b>관계 변화 민감도도 함께 높아요. 힘들 때 확인을 구하는 방식이 관계의 불안과 맞물려 더 자주 나올 수 있어요. 위로가 필요한지, 확인이 필요한지를 먼저 구분해보세요.</div>}
      {attachment.AVO >= 60 && stress.dominantCoping.includes("SC2") && <div className="note"><b>관계와 함께 보면</b>친밀감 거리두기도 함께 높아요. 혼자 정리하는 방식이 관계의 거리와 겹쳐, 힘든 시기에 더 멀리 물러나게 될 수 있어요. 정리가 끝나기 전에 한 사람에게만 짧게 알려두세요.</div>}
    </Page>

    {/* 12 Direction */}
    <Page id="direction" layer="l-dir" kicker="DIRECTION · 선택 속에서 발견된 나의 기준">
      <h2 id="direction-title">Hidden Values</h2>
      <Figure caption="막대는 열여덟 상황에서 그 가치를 얼마나 자주 우선했는지와 서로 다른 종류의 상황에서 고르게 골랐는지를 합친 점수이고, 아래 점은 그 가치가 나올 수 있었던 상황 종류 중 실제로 고른 종류의 수예요.">
        <BarList label="여덟 가지 가치 점수" rows={values.ranking.map((v, i) => ({ name: VALUES[v].name, value: values.score[v], strong: i < 3, muted: i >= 3, dots: [values.contextsHit[v], values.contextsAvailable[v]] }))} />
      </Figure>
      <p className="lead">가치는 “중요하다고 말한 것”보다, 선택이 부딪힐 때 무엇을 반복해서 지켰는지에서 더 잘 드러나요. 이 결과는 가치관을 직접 고르게 한 게 아니라, 서로 다른 열여덟 개 상황에서 우선한 선택을 모아본 거예요.</p>
      <div className="grid3">{top3.map((v, i) => <div key={v} className="cell"><b>0{i + 1} {VALUES[v].name} · {r(values.score[v])}</b>{VALUES[v].question}</div>)}</div>
      {(() => {
        const low = values.ranking.slice(-2);
        return <p>반대로 {low.map((v) => VALUES[v].name).join(" · ")}의 점수가 낮다는 건 그 가치가 중요하지 않다는 뜻이 아니에요. 다른 가치와 부딪혔을 때 양보하는 쪽이라는 뜻이에요.</p>;
      })()}
      <h3>내가 원하는 삶의 모습</h3>
      <div className="quote">{valueLife(result)}</div>
      <div className="note"><b>삶의 방향을 확인하는 질문</b>“이 선택이 {VALUES[top3[0]].name}의 방향과 맞는가?” 그리고 “그 선택이 나를 넓히는가, 가두는가?” 두 질문이 동시에 좋은 답을 낼 때 가장 오래 힘을 쓸 수 있어요.</div>
      <p className="small">가치와 Core는 같은 18개 상황 응답에서 계산되므로, 둘이 같은 방향을 가리켜도 서로를 검증하는 근거로 쓰지 않아요.</p>
    </Page>

    {/* 13 Cross insights */}
    <Page id="cross" layer="l-cross" kicker="CROSS INSIGHTS · 결과를 함께 보면">
      <h2 id="cross-title">그래서 나는 왜 이렇게 행동할까?</h2>
      {ai("cross", <p className="lead">여섯 Layer를 겹쳐 보면 가장 앞에 서는 건 {pc.name}의 {pc.seeks}이에요. 여기에 {sc.name}의 {sc.seeks}이 결을 더하고, “{SCHEMAS[schemaRanking[0]].name}”이라는 익숙한 규칙과 {top3.map((v) => VALUES[v].name).join(" · ")}의 방향이 그 힘이 쓰이는 방식을 정해요.</p>, "lead")}
      {insights.reinforcements.length > 0 ? insights.reinforcements.map((x) => <div key={x.core}>
        <h3>같은 방향으로 힘이 겹치는 지점 — {CORE[x.core].name} × {linkedLabel(x.linked)}</h3>
        <Figure caption={`${x.coreRole === "primary" ? "주" : "보조"} Core와 ${x.linked.startsWith("ST") ? "스트레스" : x.linked === "AVO" || x.linked === "ANX+ABN" ? "관계" : "패턴"} Layer가 같은 방향을 가리켜, 이 조합이 행동을 특히 강하게 움직일 수 있어요.`}>
          <Venn left={{ title: x.coreRole === "primary" ? "My Core" : "보조 Core", label: `${CORE[x.core].name} · ${r(result.core.typeScore[x.core])}` }} right={{ title: linkedLabel(x.linked), label: String(r(x.linkedScore)) }} strength={x.strength} />
        </Figure>
        <p>{CORE[x.core].name}의 마음과 “{linkedLabel(x.linked)}” 경향이 같은 방향으로 겹쳐 있어요({strengthWord(x.strength)} 조합). 서로 다른 Layer가 같은 쪽을 밀면 강점은 더 선명해지지만, 그 힘이 “선택”에서 “자동”으로 바뀔 때 비용도 함께 커져요.</p>
        <div className="grid2">
          <div className="cell"><b>강점</b>{CORE[x.core].reinforce.strength}</div>
          <div className="cell"><b>비용</b>{CORE[x.core].reinforce.cost}</div>
        </div>
      </div>) : <div className="note"><b>고르게 나뉜 힘</b>서로 다른 Layer가 같은 방향으로 강하게 겹치는 조합은 이번 결과에서 두드러지지 않았어요. 여러 힘이 비교적 고르게 나뉘어 작동하고 있다는 뜻이에요.</div>}
      {insights.counterevidence && <>
        <h3>전형적인 설명이 전부는 아닙니다</h3>
        <p>{pc.name}의 마음은 흔히 “{pc.typical}”으로 단순하게 설명되곤 해요. 하지만 이번 결과는 그 설명을 강하게 뒷받침하지 않았어요. 그 설명과 연결된 신호({insights.counterevidence.typical.map(linkedLabel).join(" · ")})가 평균 {r(insights.counterevidence.typicalScore)}로 낮게 나왔거든요.{state.band === "expansion" && ` 무엇보다 지난 한 달의 ${nm}은 자신에게 관대하고 유연했어요.`}</p>
        <div className="note"><b>더 가까운 설명</b>{pc.better}</div>
        <div className="grid2">
          <div className="cell"><b>전형적 라벨</b>{pc.name} = {pc.typical}</div>
          <div className="cell"><b>이번 결과</b>{pc.name} = {pc.strengths}</div>
        </div>
      </>}
    </Page>

    {/* 14 Growth */}
    <Page id="growth" layer="l-state" kicker="GROWTH · 지금의 나에게 필요한 방향">
      <h2 id="growth-title">{pc.growth.headline}</h2>
      <div className="grid3">
        <div className="cell"><b>Keep</b><ul>{pc.growth.keep.map((s) => <li key={s}>{s}</li>)}</ul></div>
        <div className="cell"><b>Watch</b><ul>{pc.growth.watch.map((s) => <li key={s}>{s}</li>)}</ul></div>
        <div className="cell"><b>Develop</b><ul>{pc.growth.develop.map((s) => <li key={s}>{s}</li>)}</ul></div>
      </div>
      <p className="lead">{pc.growth.lead}</p>
      <div className="note"><b>조금 내려놓아도 되는 것</b>{pc.growth.letGo}</div>
      {result.growth.experiments > 0 ? <>
        <h3>나를 위한 작은 실험</h3>
        <p>{result.growth.experiments === 3 ? "지금은 여유가 있는 상태라 실험을 세 가지 제안해요." : "지금은 두 가지만 제안해요. 부담이 되지 않는 선에서 하나씩 해보세요."} 목적은 성격을 고치는 게 아니에요. 익숙한 반응이 자동으로 나오기 전에 한 박자 멈추고, 덜 쓰던 선택지를 실제로 꺼내보는 거예요.</p>
        {pc.growth.experiments.slice(0, result.growth.experiments).map((e, i) => <div key={e.title} className="note"><b>0{i + 1} · {e.title}</b>{e.text}</div>)}
      </> : <>
        <h3>지금은 실험보다 질문을</h3>
        <p>지금은 과제를 늘리기보다 회복이 먼저인 시기예요. 그래서 실험 대신 천천히 머물러볼 질문을 드려요. 답을 찾지 않아도 괜찮아요.</p>
        <ol className="reflect">{pc.growth.reflections.map((s) => <li key={s}>{s}</li>)}</ol>
      </>}
      <p className="small">성장 준비도 {r(result.growth.readiness)} · 요즘의 상태와 여유에 맞춰 제안의 개수를 조절했어요.</p>
    </Page>

    {/* 15 Letter */}
    <Page id="letter" layer="l-cross" kicker="지금의 나에게 필요한 메시지">
      <h2 id="letter-title">Letter to Myself</h2>
      <p className="lead">{f(pc.letter[0])}</p>
      {ai("letter", <><p>{f(pc.letter[1])}</p>
      <p>{state.band === "expansion" ? `요즘의 ${nm}은 그걸 조금씩 알아가고 있는 것 같아요. 이 계절이 오래가길 바라요.` : state.band === "balanced" ? "지금은 여유와 긴장 사이를 오가는 계절이에요. 여유가 있는 날의 나를 기억해두면, 힘든 날에 돌아갈 길이 돼요." : "지금은 조금 지친 계절일 수 있어요. 이 리포트가 무엇을 더 하라는 말이 아니라, 지금까지 충분히 애써왔다는 말로 읽히면 좋겠어요."}</p></>)}
      <div className="quote">{pc.question}</div>
      <h3>결국, 나는</h3>
      <div className="selfcard">
        <div className="t">MY SELF CARD{name ? ` · ${name}` : ""}</div>
        <div className="q">{pc.card}</div>
        <div className="g">
          <div><b>MY CORE</b>{pc.name} · {pc.title}</div>
          <div><b>MY RELATIONSHIP</b>{rel.label} 관계 속의 나</div>
          <div><b>MY PATTERN</b>{SCHEMAS[schemaRanking[0]].name}</div>
          <div><b>MY DIRECTION</b>{top3.map((v) => VALUES[v].name).join(" · ")}</div>
          <div className="full"><b>MY QUESTION</b>{pc.question}</div>
        </div>
      </div>
      <h3>이 리포트를 덮기 전에</h3>
      <ol className="reflect">
        {pc.growth.reflections.map((s) => <li key={s}>{s}</li>)}
        <li>이 리포트에서 가장 오래 마음이 멈춘 문장은 무엇이었나요?</li>
      </ol>
      <p className="small" style={{ marginTop: 32 }}>2~4주 뒤 한 번 더 돌아와 보세요. 실제 생활에서 패턴을 한두 번 알아차린 뒤 다시 읽으면 문장의 의미가 달라질 수 있어요. SELF-LAYERS의 목적은 자신을 고정하는 것이 아니라 선택할 수 있는 여지를 늘리는 데 있어요.</p>
      <p className="disclaimer" style={{ marginTop: 24 }}>{SOURCE_NOTE}</p>
    </Page>
  </article>;
}
