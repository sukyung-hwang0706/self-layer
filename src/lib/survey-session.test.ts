import assert from "node:assert/strict";
import { test } from "node:test";
import questions from "../data/questions.json";
import { emptySession, missingQuestions, navigateSession, restoreSession, sessionHash } from "./survey-session";

test("empty and corrupt storage restore an empty survey", () => {
  for (const raw of [null, "{bad", "null", "{}", '{"version":2,"answers":{}}']) {
    assert.deepEqual(restoreSession(raw), emptySession());
  }
});
test("restore only valid known answers and bound the current index", () => {
  const restored = restoreSession(JSON.stringify({ version: 1, index: 999, stage: "result", answers: {
    [questions[0].id]: 4, [questions[1].id]: "3", [questions[2].id]: 0, [questions[3].id]: 5.5, unknown: 5,
  } }));
  assert.deepEqual(restored.answers, { [questions[0].id]: 4 });
  assert.equal(restored.index, 0);
  assert.equal(restored.stage, "question");
});
test("completion requires 108 valid answers; arbitrary extra IDs do not count", () => {
  assert.equal(missingQuestions({}).length, 108);
  assert.equal(missingQuestions({ unknown: 5 }).length, 108);
  const answers = Object.fromEntries(questions.map((q) => [q.id, 3 as const]));
  assert.equal(missingQuestions(answers).length, 0);
  const restored = restoreSession(JSON.stringify({ version: 1, answers, index: 107, stage: "result" }));
  assert.equal(restored.stage, "result");
  assert.equal(sessionHash(restored), "#result");
});
test("history navigation changes position without replacing responses", () => {
  const session = { ...emptySession(), answers: { [questions[0].id]: 4 as const }, index: 2 };
  const previous = navigateSession(session, "#question-1");
  assert.equal(previous.index, 0);
  assert.deepEqual(previous.answers, session.answers);
  assert.equal(navigateSession(previous, "#result").stage, "question");
  assert.equal(navigateSession(previous, "#review").stage, "review");
  assert.equal(navigateSession(previous, "#question-999").index, 0);
  assert.equal(sessionHash(previous), "#question-1");
});
