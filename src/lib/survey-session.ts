import questions from "../data/questions.json";
import type { SurveyAnswers } from "../types/survey";

export const SESSION_KEY = "self-layers:survey:v1";
export type SurveyStage = "question" | "review" | "result";
export interface SurveySession {
  version: 1;
  answers: SurveyAnswers;
  index: number;
  stage: SurveyStage;
}
export function emptySession(): SurveySession {
  return { version: 1, answers: {}, index: 0, stage: "question" };
}
export function missingQuestions(answers: SurveyAnswers) {
  return questions.filter((q) => {
    const value = answers[q.id];
    return !Object.hasOwn(answers, q.id) || !Number.isInteger(value) || value! < 1 || value! > 5;
  });
}
/** Stored data is untrusted; recover only valid known answers. */
export function restoreSession(raw: string | null): SurveySession {
  if (!raw) return emptySession();
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !data.answers || typeof data.answers !== "object" || Array.isArray(data.answers)) return emptySession();
    const answers: SurveyAnswers = {};
    for (const q of questions) {
      const value = data.answers[q.id];
      if (Number.isInteger(value) && value >= 1 && value <= 5) answers[q.id] = value;
    }
    const index = Number.isInteger(data.index) && data.index >= 0 && data.index < questions.length ? data.index : 0;
    const stage: SurveyStage = data.stage === "review" || (data.stage === "result" && missingQuestions(answers).length === 0) ? data.stage : "question";
    return { version: 1, answers, index, stage };
  } catch { return emptySession(); }
}
export function sessionHash(session: SurveySession) {
  return session.stage === "question" ? `#question-${session.index + 1}` : `#${session.stage}`;
}
export function navigateSession(session: SurveySession, hash: string): SurveySession {
  const match = /^#question-(\d+)$/.exec(hash);
  if (match) {
    const index = Number(match[1]) - 1;
    if (index >= 0 && index < questions.length) return { ...session, index, stage: "question" };
  }
  if (hash === "#review") return { ...session, stage: "review" };
  if (hash === "#result" && missingQuestions(session.answers).length === 0) return { ...session, stage: "result" };
  return { ...session, stage: "question" };
}
