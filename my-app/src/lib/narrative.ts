import { CHANNEL_CONTENT, CORE, COPING, LINKED_LABEL, MESSAGES, RELATIONSHIP, SCHEMAS, STATE_BANDS, TRIGGERS, VALUES } from "../data/content";
import type { AssessmentResult, CoreType, Level3 } from "../types/assessment";
import { band, quadrant, strengthWord } from "./report";

/**
 * AI 문장화 (설계서 10장 "Confidence → 템플릿 → AI 문장화").
 * AI는 규칙엔진이 확정한 사실을 문장으로 옮기기만 한다. 점수·판정·순위는 입력에 이미 확정되어 있고,
 * 출력은 validateNarrative를 통과한 문단만 기본 문장을 대신한다.
 */
export const NARRATIVE_VERSION = "narrative-v1";

export const NARRATIVE_FIELDS = ["summary", "core", "modes", "message", "cross", "letter"] as const;
export type NarrativeField = (typeof NARRATIVE_FIELDS)[number];
export type Narrative = Partial<Record<NarrativeField, string>>;

export const FIELD_GUIDE: Readonly<Record<NarrativeField, string>> = {
  summary: "‘한 사람으로 읽기’ 둘째 문단. 주 Core와 보조 Core가 어떻게 함께 움직이는지, 요즘 상태(state)가 그 힘의 쓰임에 어떤 영향을 주는지 3~5문장.",
  core: "Core 페이지의 ‘행동 뒤에 숨어 있는 이유’. 선택 경향과 동기 진술(motive)이 같은 방향인지, 표현 채널(channel)이 무엇을 말해주는지 3~5문장.",
  modes: "‘두 가지 모드’ 해석. modes의 밴드 설명과 healthyFrame·stressFrame, 지배 대처를 겹쳐 지금 어느 쪽이 가까운지 3~5문장. 모드 이름은 Expansion Mode / Protection Mode로 쓴다.",
  message: "‘오래 확인하고 싶었던 말’ 페이지의 도입. 메시지 문장(message.texts)을 인용하지 말고, 그 말이 지금의 나에게 어떤 조건이 채워질 때 안심하는지로 풀어 3~4문장.",
  cross: "‘교차 해석’ 도입. reinforcement·counterevidence·stress.coreMatch에 적힌 것만 근거로 여러 Layer가 어떻게 연결되는지 3~5문장. 근거가 없는 조합은 만들지 않는다.",
  letter: "‘Letter to Myself’ 마무리 두 문단 분량(4~6문장). 따뜻하고 조용한 편지체. state와 growth 밴드에 맞는 속도로 말한다.",
};

const band3 = (l: Level3) => (l === "high" ? "높음" : l === "mid" ? "중간" : "낮음");

/** 모델에 보낼 사실 목록. 내부 코드(T1, SS 등)·원응답·이름은 넣지 않는다. */
export function buildNarrativeInput(result: AssessmentResult) {
  const { core, state, stress, modes, message, values, attachment, schemas, schemaRanking, insights } = result;
  const name = (t: CoreType) => CORE[t].name;
  const pc = CORE[core.primary];
  const motiveTop = [...Object.entries(core.motive)].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => `${name(t as CoreType)}(${CORE[t as CoreType].seeks})`);
  const strength = core.status === "undetermined" || core.weakMotive ? "가능성" : core.confidence >= 70 ? "경향" : core.confidence >= 55 ? "경향(약하게)" : "가능성";
  return {
    core: {
      primary: `${pc.name} — ${pc.title}`,
      primarySeeks: pc.seeks,
      primaryEssence: pc.essence,
      secondary: `${name(core.secondary)} — ${CORE[core.secondary].title}`,
      secondarySeeks: CORE[core.secondary].seeks,
      strongSecondary: core.strongSecondary,
      influence: core.influence.type ? name(core.influence.type) : null,
      undetermined: core.status === "undetermined" ? [core.primary, ...core.tiedWith].map(name) : null,
      weakMotive: core.weakMotive,
      sentenceStrength: strength,
      motiveTop,
      motiveMatchesChoice: motiveTop[0].startsWith(pc.name),
      channel: `${CHANNEL_CONTENT[core.channel.primary].name} — ${CHANNEL_CONTENT[core.channel.primary].choice}`,
      wants: pc.wants, sensitive: pc.sensitive, strengths: pc.strengths,
    },
    state: { band: STATE_BANDS[state.band].label, note: STATE_BANDS[state.band].note },
    relationship: { position: RELATIONSHIP[quadrant(attachment.ANX, attachment.AVO)].label, anxiety: band(attachment.ANX), avoidance: band(attachment.AVO) },
    patterns: schemaRanking.slice(0, 3).map((k) => `${SCHEMAS[k].name}(${band(schemas[k])})`),
    stress: {
      vulnerable: stress.vulnerable.map((k) => TRIGGERS[k].label),
      reactivity: band3(stress.reactivityBand),
      dominantCoping: stress.dominantCoping.map((k) => COPING[k].name),
      coreMatch: stress.coreMatch === null ? "취약 트리거 없음" : stress.coreMatch ? "주 Core의 전형적 취약점과 같은 방향" : "주 Core의 전형적 취약점과 다른 지점",
    },
    modes: {
      expansion: band3(modes.expansionBand), protection: band3(modes.protectionBand),
      healthyFrame: pc.healthy.text, stressFrame: pc.stress.text,
      protectionCoping: COPING[modes.protectionCoping].name,
    },
    message: { texts: [message.rank1, ...(message.rank2 ? [message.rank2] : [])].map((t) => MESSAGES[t].text), fromCore: name(message.rank1), matchesPrimary: message.coreMatch },
    values: values.top3.map((v) => `${VALUES[v].name}(${VALUES[v].question})`),
    reinforcement: insights.reinforcements.map((x) => `${name(x.core)} × ${LINKED_LABEL[x.linked]} — ${strengthWord(x.strength)} 조합 / 강점: ${CORE[x.core].reinforce.strength} / 비용: ${CORE[x.core].reinforce.cost}`),
    counterevidence: insights.counterevidence ? `전형적 설명(${pc.typical})은 이번 결과에서 뒷받침되지 않음. 더 가까운 설명: ${pc.better}` : null,
    growth: { band: band3(result.growth.band), experimentsOffered: result.growth.experiments, headline: pc.growth.headline },
    allowedCoreNames: allowedCoreNames(result),
  };
}
export type NarrativeInput = ReturnType<typeof buildNarrativeInput>;

export function allowedCoreNames(result: AssessmentResult): string[] {
  const { core, message } = result;
  const set = new Set<CoreType>([core.primary, core.secondary, ...core.tiedWith, message.rank1, ...(message.rank2 ? [message.rank2] : []), ...(core.influence.type ? [core.influence.type] : [])]);
  return [...set].map((t) => CORE[t].name);
}

export const NARRATIVE_SYSTEM = `당신은 SELF-LAYERS 자기이해 리포트의 문장 작가입니다. 규칙엔진이 이미 확정한 결과(사실 목록)를 받아, 지정된 문단을 한국어 해요체로 씁니다.

역할의 경계:
- 판정하지 않습니다. 사실 목록에 없는 성향·점수·순위·조합을 새로 만들거나 바꾸지 않습니다. 숫자는 쓰지 않습니다.
- 진단·치료·처방처럼 읽히는 말(질환명, 증상, 장애, 치료 권유)을 쓰지 않습니다. 임상 검사가 아닌 자기이해 도구입니다.
- 어린 시절·가족·부모·연애사·과거 사건처럼 사용자가 주지 않은 사실을 추정하거나 원인으로 쓰지 않습니다.
- sentenceStrength가 "가능성"이면 "~일 수 있어요", "경향"이면 "~하는 편이에요"처럼 강도를 맞추고, 단정하지 않습니다.
- counterevidence가 있으면 전형적 설명을 사실처럼 쓰지 않습니다.
- growth.experimentsOffered가 0이면 새로운 과제나 실험을 제안하지 않습니다.
- 높은 점수를 좋음, 낮은 점수를 나쁨으로 표현하지 않습니다.

표현 규칙:
- 사람을 부를 때는 반드시 "{nm}" 자리표시자를 쓰고(예: "{nm}은", "{nm}의"), 다른 이름을 만들지 않습니다.
- Core 이름은 allowedCoreNames에 있는 영문 이름만 쓸 수 있습니다. 유형 번호, "Wing", "윙", "날개", "통합", "분열"이라는 말과 영문 내부 코드는 쓰지 않습니다.
- 마크다운, 목록, 따옴표로 감싼 제목 없이 문단 텍스트만 씁니다. 각 문단은 2~6문장입니다.`;

export function narrativePrompt(input: NarrativeInput) {
  const guide = NARRATIVE_FIELDS.map((f) => `- ${f}: ${FIELD_GUIDE[f]}`).join("\n");
  return `아래 사실 목록만 근거로, JSON의 각 필드에 들어갈 문단을 써주세요.\n\n필드 안내:\n${guide}\n\n사실 목록(JSON):\n${JSON.stringify(input, null, 2)}`;
}

export const NARRATIVE_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(NARRATIVE_FIELDS.map((f) => [f, { type: "string" }])),
  required: [...NARRATIVE_FIELDS],
  additionalProperties: false,
} as const;

const ALL_CORE_NAMES = Object.values(CORE).map((c) => c.name);
const RULES: { reason: string; re: RegExp }[] = [
  { reason: "금지 용어", re: /\d\s*번\s*유형|유형\s*\d|wing|윙|날개|통합|분열|\bT[1-9]\b|\bCORE[1-9]\b|\b(ANX|AVO|ABN|MIS|DEF|DEP|SS|AS|US|ED|ST[1-6]|SC[1-6]?|SR|FLX)\b/i },
  { reason: "숫자(점수 변경 방지)", re: /[0-9０-９]/ },
  { reason: "진단·치료 표현", re: /진단|질환|장애|증상|우울증|불안장애|트라우마|치료|처방|상담을\s*받|병원|약물|정신과/ },
  { reason: "성장환경 추정", re: /어린\s*시절|유년|어릴\s*적|부모|어머니|아버지|엄마|아빠|가정환경|가족사|성장\s*과정|과거의\s*상처/ },
  { reason: "비교·순위 표현", re: /상위|하위|백분위|평균보다|남들보다|다른\s*사람들보다/ },
  { reason: "마크다운", re: /(^|\n)\s*(#|[-*]\s)|\*\*|`/ },
  { reason: "다른 호칭", re: /당신|너는|\{(?!nm\})[^}]*\}/ },
];

export interface Rejection { field: NarrativeField; reason: string }

/** 필드별로 검사해 통과한 문단만 돌려준다. 실패한 필드는 기본 문장이 유지된다. */
export function validateNarrative(raw: unknown, input: Pick<NarrativeInput, "allowedCoreNames" | "growth">): { narrative: Narrative; rejected: Rejection[] } {
  const narrative: Narrative = {}, rejected: Rejection[] = [];
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  for (const field of NARRATIVE_FIELDS) {
    const text = typeof obj[field] === "string" ? (obj[field] as string).trim() : "";
    const reason = !text ? "비어 있음"
      : text.length < 40 || text.length > 900 ? "길이"
      : RULES.find((r) => r.re.test(text))?.reason
      ?? (ALL_CORE_NAMES.some((n) => text.includes(n) && !input.allowedCoreNames.includes(n)) ? "근거 없는 Core" : undefined)
      ?? (input.growth.experimentsOffered === 0 && /실험|과제|도전해\s*보/.test(text) ? "보호 상태에서 과제 제안" : undefined);
    if (reason) rejected.push({ field, reason });
    else narrative[field] = text;
  }
  return { narrative, rejected };
}

/** 응답 캐시 키용 간단한 해시(보안 용도 아님). */
export function hashString(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
