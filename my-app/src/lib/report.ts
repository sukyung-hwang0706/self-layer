import { CORE, LINKED_LABEL, SCHEMAS, TRIGGERS, VALUES, type Quadrant } from "../data/content";
import type { AssessmentResult, CoreType } from "../types/assessment";

/** 표시용 반올림. 판정에는 쓰지 않는다. */
export const r = (n: number) => Math.round(n);

export function honorific(name: string) {
  return name ? `${name}님` : "당신";
}

export function fillText(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (m, key: string) => vars[key] ?? m);
}

/** 차트 색 띠와 같은 표시 구간. 좋고 나쁨이 아니라 강도의 구간이다. */
export type Band = "낮음" | "중간" | "다소 높음" | "높음";
export function band(score: number): Band {
  return score >= 75 ? "높음" : score >= 60 ? "다소 높음" : score >= 40 ? "중간" : "낮음";
}

export function quadrant(anx: number, avo: number): Quadrant {
  const watch = anx >= 50, dist = avo >= 50;
  return dist ? (watch ? "distWatch" : "distCalm") : (watch ? "closeWatch" : "closeCalm");
}

export const coreName = (t: CoreType) => CORE[t].name;

/**
 * Core 문장 강도. 동점 유보·동기 진술 약함·낮은 신뢰도에서는 단정하지 않는다.
 * CoreConfidence 70 이상이면 "~예요", 55 이상이면 "~에 가까워요", 그 밖은 "~에 가까워 보여요".
 */
export function coreTone(result: AssessmentResult): "assert" | "likely" | "tentative" {
  const { confidence, weakMotive, status } = result.core;
  if (status === "undetermined" || weakMotive) return "tentative";
  return confidence >= 70 ? "assert" : confidence >= 55 ? "likely" : "tentative";
}

export function coreSentence(result: AssessmentResult, nm: string) {
  const name = coreName(result.core.primary);
  if (result.core.status === "undetermined") {
    const names = [result.core.primary, ...result.core.tiedWith].map(coreName).join(" · ");
    return `${nm}을 움직이는 힘은 한 가지로 좁혀지지 않았어요. ${names}가 같은 무게로 나타나, 이 리포트는 그중 ${name}을 기준으로 읽되 다른 힘도 함께 살펴봐요.`;
  }
  const tone = coreTone(result);
  if (tone === "assert") return `${nm}을 가장 자주 움직이는 힘은 ${name}예요.`;
  if (tone === "likely") return `${nm}을 가장 자주 움직이는 힘은 ${name}에 가까워요.`;
  return `${nm}을 움직이는 힘은 ${name}에 가까워 보여요. 다만 확신의 정도가 높지 않아서, 아래 설명은 단정이 아니라 가능성으로 읽어주세요.`;
}

/** V0.2 문장 강도 밴드: <55 미노출 / 55–69 가능성 / 70–84 경향 / 85+ 반복 */
export function strengthWord(strength: number) {
  return strength >= 85 ? "반복적으로 나타나는" : strength >= 70 ? "뚜렷한 경향으로 보이는" : "가능성이 보이는";
}

export function linkedLabel(key: string) {
  return LINKED_LABEL[key] ?? key;
}

export function valueLife(result: AssessmentResult) {
  const [a, b, c] = result.values.top3.map((v) => VALUES[v].life);
  return `“${a}, ${b}, ${c} 살아가는 삶.”`;
}

/** Self Map 여섯 꼭짓점 (설계서 11장 03 페이지 변수) */
export function selfMapAxes(result: AssessmentResult) {
  const { core, state, attachment, schemaRanking, schemas, stress, values } = result;
  const relKey = attachment.ANX >= attachment.AVO ? "ANX" : "AVO";
  const relScore = attachment[relKey];
  const topTrigger = [...Object.entries(stress.triggers)].sort((a, b) => b[1] - a[1])[0] as [keyof typeof TRIGGERS, number];
  const topValue = values.ranking[0];
  return [
    { layer: "core", caption: "나를 움직이는 힘", label: coreName(core.primary), score: core.typeScore[core.primary] },
    { layer: "state", caption: "요즘 마음 상태", label: state.band === "expansion" ? "여유 있음" : state.band === "balanced" ? "평소의 나" : "보호 상태", score: state.index },
    { layer: "rel", caption: "관계에서 나", label: relScore >= 50 ? (relKey === "ANX" ? "살피는 편" : "거리를 두는 편") : "편안한 편", score: relScore },
    { layer: "pat", caption: "반복하는 습관", label: SCHEMAS[schemaRanking[0]].name, score: schemas[schemaRanking[0]] },
    { layer: "str", caption: "가장 흔들리는 순간", label: TRIGGERS[topTrigger[0]].label, score: topTrigger[1] },
    { layer: "dir", caption: "삶의 기준", label: VALUES[topValue].name, score: values.score[topValue] },
  ] as const;
}
