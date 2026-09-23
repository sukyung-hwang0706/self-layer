import { DISPLAY_ORDER } from "../data/items";
import type { Answer } from "../types/assessment";
import { isValidAnswer, missingItems } from "./scoring";

export const SESSION_KEY = "self-layers:v1.0:session";
export const NAME_MAX = 20;

export type Stage = "intro" | "question" | "review";

export interface Session {
  version: 2;
  name: string;
  answers: Record<string, Answer>;
  /** DISPLAY_ORDER 기준 현재 문항 위치 */
  index: number;
  stage: Stage;
  /** 제출 시각(ISO). 제출 후 응답을 바꾸면 다시 null이 된다. */
  completedAt: string | null;
}

export function emptySession(): Session {
  return { version: 2, name: "", answers: {}, index: 0, stage: "intro", completedAt: null };
}

export function cleanName(name: unknown): string {
  return typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX) : "";
}

export function isComplete(session: Session) {
  return missingItems(session.answers).length === 0;
}

/** 저장소 값은 신뢰하지 않는다. 알려진 문항의 유효한 응답만 복구한다. */
export function restoreSession(raw: string | null): Session {
  if (!raw) return emptySession();
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 2 || !data.answers || typeof data.answers !== "object" || Array.isArray(data.answers)) return emptySession();
    const answers: Record<string, Answer> = {};
    for (const id of DISPLAY_ORDER) if (isValidAnswer(id, data.answers[id])) answers[id] = data.answers[id];
    const index = Number.isInteger(data.index) && data.index >= 0 && data.index < DISPLAY_ORDER.length ? data.index : 0;
    const stage: Stage = data.stage === "question" || data.stage === "review" ? data.stage : "intro";
    const session: Session = { version: 2, name: cleanName(data.name), answers, index, stage, completedAt: null };
    const completedAt = typeof data.completedAt === "string" && !Number.isNaN(Date.parse(data.completedAt)) ? data.completedAt : null;
    return { ...session, completedAt: completedAt && isComplete(session) ? completedAt : null };
  } catch {
    return emptySession();
  }
}

export function setAnswer(session: Session, id: string, answer: Answer | undefined): Session {
  const answers = { ...session.answers };
  if (answer === undefined) delete answers[id];
  else answers[id] = answer;
  return { ...session, answers, completedAt: null };
}

export function sessionHash(session: Session) {
  if (session.stage === "question") return `#q${session.index + 1}`;
  return session.stage === "review" ? "#review" : "#start";
}

export function navigateSession(session: Session, hash: string): Session {
  const match = /^#q(\d+)$/.exec(hash);
  if (match) {
    const index = Number(match[1]) - 1;
    if (index >= 0 && index < DISPLAY_ORDER.length) return { ...session, index, stage: "question" };
  }
  if (hash === "#review") return { ...session, stage: "review" };
  if (hash === "#start") return { ...session, stage: "intro" };
  return session;
}
