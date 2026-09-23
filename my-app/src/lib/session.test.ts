import assert from "node:assert/strict";
import { test } from "node:test";
import { emptySession, navigateSession, restoreSession, sessionHash, setAnswer } from "./session";
import { makeAnswers } from "./test-fixtures";

test("잘못된 저장값은 빈 세션으로 복구한다", () => {
  assert.deepEqual(restoreSession("{"), emptySession());
  assert.deepEqual(restoreSession(JSON.stringify({ version: 1, answers: {} })), emptySession());
  assert.deepEqual(restoreSession(null), emptySession());
});

test("알려진 문항의 유효한 응답만 복구한다", () => {
  const s = restoreSession(JSON.stringify({ version: 2, name: "  홍  길동 ", stage: "question", index: 3, answers: { M1: 4, M2: 9, X1: 3, E01: { first: "B", second: "C" }, E02: { first: "A" } } }));
  assert.deepEqual(s.answers, { M1: 4, E01: { first: "B", second: "C" } });
  assert.equal(s.name, "홍 길동");
  assert.equal(s.index, 3);
  assert.equal(s.stage, "question");
});

test("완료 시각은 모든 응답이 있을 때만 유지한다", () => {
  const completedAt = "2026-09-23T01:00:00.000Z";
  assert.equal(restoreSession(JSON.stringify({ version: 2, answers: makeAnswers(), completedAt })).completedAt, completedAt);
  const partial = makeAnswers();
  delete partial.P9;
  assert.equal(restoreSession(JSON.stringify({ version: 2, answers: partial, completedAt })).completedAt, null);
});

test("응답을 바꾸면 완료 상태가 풀린다", () => {
  const s = { ...emptySession(), answers: makeAnswers(), completedAt: "2026-09-23T01:00:00.000Z" };
  assert.equal(setAnswer(s, "M1", 5).completedAt, null);
  assert.equal(setAnswer(s, "M1", undefined).answers.M1, undefined);
});

test("해시로 문항·확인 화면을 오간다", () => {
  const s = emptySession();
  assert.equal(sessionHash(s), "#start");
  const q = navigateSession(s, "#q12");
  assert.equal(q.stage, "question");
  assert.equal(q.index, 11);
  assert.equal(sessionHash(q), "#q12");
  assert.equal(navigateSession(q, "#review").stage, "review");
  assert.equal(navigateSession(q, "#q999"), q);
});
