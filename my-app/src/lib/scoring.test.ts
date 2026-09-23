import assert from "node:assert/strict";
import { test } from "node:test";
import { IncompleteAnswersError, missingItems, PROTECTION_COPING, scoreAssessment } from "./scoring";
import { makeAnswers } from "./test-fixtures";

const close = (actual: number, expected: number, msg?: string) => assert.ok(Math.abs(actual - expected) < 1e-9, `${msg ?? ""} ${actual} ≠ ${expected}`);

test("미응답이 있으면 채점하지 않는다", () => {
  const answers = makeAnswers();
  delete answers.M3;
  assert.throws(() => scoreAssessment(answers), (e) => e instanceof IncompleteAnswersError && e.missing.includes("M3"));
});

test("잘못된 응답(같은 선택지 1·2순위, 범위 밖 값, 순위 중복)은 미응답으로 본다", () => {
  const answers = makeAnswers({ E01: { first: "A", second: "A" }, A1: 6 as never, CH1: ["A", "A", "B"] });
  assert.deepEqual(missingItems(answers), ["E01", "A1", "CH1"]);
});

test("같은 응답은 항상 같은 결과를 낸다", () => {
  assert.deepEqual(scoreAssessment(makeAnswers()), scoreAssessment(makeAnswers()));
});

test("Core: 1순위 +2, 2순위 +1로 TypeRaw를 쌓고 12점 만점으로 환산한다", () => {
  const { core } = scoreAssessment(makeAnswers());
  assert.deepEqual(core.raw, { T1: 9, T2: 6, T3: 8, T4: 3, T5: 5, T6: 4, T7: 8, T8: 8, T9: 3 });
  close(core.typeScore.T1, 75);
  assert.equal(core.primary, "T1");
  assert.equal(core.status, "determined");
  close(core.separation, 25);
  // 0.5×75 + 0.2×25 + 0.3×M(T1)=50
  close(core.confidence, 57.5);
  assert.equal(core.influence.type, "T2");
  assert.deepEqual(core.influence.candidates, ["T9", "T2"]);
});

test("Core 동점: TypeScore → M(Tn) → 1순위 횟수 순으로 가린다", () => {
  // T3·T7·T8 모두 raw 8, 1순위 3회. 기본 M이 같으면 정의 순서로 T3이 두 번째.
  assert.equal(scoreAssessment(makeAnswers()).core.secondary, "T3");
  assert.equal(scoreAssessment(makeAnswers({ M7: 5 })).core.secondary, "T7");
});

test("Core 세 단계 동점까지 같으면 판정 유보로 표시한다", () => {
  // E07 2순위를 C로 바꾸면 T1도 raw 8. M1을 낮추면 T3·T7·T8이 모든 기준에서 동점.
  const { core } = scoreAssessment(makeAnswers({ E07: { first: "A", second: "C" }, M1: 1 }));
  assert.equal(core.status, "undetermined");
  assert.equal(core.primary, "T3");
  assert.deepEqual(core.tiedWith, ["T7", "T8"]);
});

test("M(Top1) < 40이면 동기 진술 약함, M(Top2) ≥ 75이고 차이 8 이내면 강한 보조 Core", () => {
  assert.equal(scoreAssessment(makeAnswers({ M1: 2 })).core.weakMotive, true);
  assert.equal(scoreAssessment(makeAnswers({ M1: 3 })).core.weakMotive, false);
  // raw 차이 1(8.3점)이면 강한 보조 Core가 아니다.
  const apart = scoreAssessment(makeAnswers({ M3: 4 }));
  assert.equal(apart.core.secondary, "T3");
  assert.equal(apart.core.strongSecondary, false);
  // T1·T3 raw 동점, M 동점(75) → 1순위 횟수로 T1이 Primary, T3은 강한 보조 Core
  const r = scoreAssessment(makeAnswers({ E07: { first: "A", second: "C" }, M1: 4, M3: 4 }));
  assert.equal(r.core.primary, "T1");
  assert.equal(r.core.secondary, "T3");
  assert.equal(r.core.strongSecondary, true);
});

test("Value: 같은 문항의 같은 Value는 최대 2점, 선택 60% + 맥락 다양성 40%", () => {
  const base = scoreAssessment(makeAnswers());
  assert.equal(base.values.capped.EXP, 7);
  close(base.values.selection.EXP, 7 / 8 * 100);
  assert.equal(base.values.contextsAvailable.EXP, 3);
  close(base.values.score.EXP, 0.6 * 87.5 + 40);
  close(base.values.score.SEC, 0.6 * (6 / 14 * 100) + 0.4 * 100);
  // E03에서 EXP를 1·2순위 모두 고르면 3점이지만 2점으로 제한된다.
  assert.equal(scoreAssessment(makeAnswers({ E03: { first: "A", second: "C" } })).values.capped.EXP, 7);
});

test("역채점: 역문항은 6 − 응답으로 계산한다", () => {
  const r = scoreAssessment(makeAnswers({ A1: 5, A2: 5, A3: 5, A4: 1 }));
  close(r.attachment.ANX, 100);
  close(scoreAssessment(makeAnswers({ A4: 5 })).attachment.ANX, to100((3 + 3 + 3 + 1) / 4));
});

test("응답 일관성: 역채점 후 4점 차이 쌍이 4개 이상이면 플래그와 Confidence −5", () => {
  const pairs = { S1: 5, S2: 5, S3: 5, S4: 5, S5: 5, S6: 5, S7: 1, S8: 1 } as const;
  const r = scoreAssessment(makeAnswers(pairs));
  assert.deepEqual(r.consistency.inconsistentSchemas, ["ABN", "ED", "MIS", "DEF"]);
  assert.equal(r.consistency.flag, true);
  close(r.core.confidence, 57.5 - 5);
  const three = scoreAssessment(makeAnswers({ S1: 5, S2: 5, S3: 5, S4: 5, S5: 5, S6: 5 }));
  assert.equal(three.consistency.flag, false);
});

test("STATE = 0.35·SC + 0.35·FLX + 0.30·욕구 평균, 밴드는 70/45 경계", () => {
  const high = scoreAssessment(makeAnswers({ P1: 5, P2: 5, P3: 1, P4: 5, P5: 5, P6: 1, P7: 5, P8: 5, P9: 5 }));
  close(high.state.index, 100);
  assert.equal(high.state.band, "expansion");
  const mid = scoreAssessment(makeAnswers());
  close(mid.state.index, 50);
  assert.equal(mid.state.band, "balanced");
  const low = scoreAssessment(makeAnswers({ P1: 2, P2: 2, P3: 4, P4: 2, P5: 2, P6: 4, P7: 2, P8: 2, P9: 2 }));
  close(low.state.index, 25);
  assert.equal(low.state.band, "protection");
});

test("Stress Signature: 65 이상 트리거 최대 2개, 지배 대처 동점은 모두 표기", () => {
  const r = scoreAssessment(makeAnswers({ ST1: 4, ST3: 5, ST6: 5, SC2: 5, SC4: 5 }));
  assert.deepEqual(r.stress.vulnerable, ["ST3", "ST6"]);
  assert.deepEqual(r.stress.dominantCoping, ["SC2", "SC4"]);
  assert.equal(r.stress.coreMatch, false); // Primary T1은 ST3·ST6의 연결 Core가 아니다
  assert.equal(scoreAssessment(makeAnswers({ ST1: 5 })).stress.coreMatch, true);
  assert.equal(scoreAssessment(makeAnswers()).stress.coreMatch, null);
  close(scoreAssessment(makeAnswers({ SR1: 5, SR2: 5, SR3: 1 })).stress.reactivity, 100);
});

test("Expansion·Protection·Growth 준비도 계산식", () => {
  const r = scoreAssessment(makeAnswers({ SC2: 5 }));
  assert.equal(r.modes.protectionCoping, PROTECTION_COPING.T1);
  close(r.modes.expansion, 0.55 * 50 + 0.25 * 50 + 0.20 * 50);
  close(r.modes.protection, 0.40 * 100 + 0.35 * 50 + 0.25 * 50);
  assert.equal(r.modes.protectionBand, "high");
  assert.equal(r.modes.growthDirection, "T7");
  assert.equal(r.modes.stressDirection, "T4");
  close(r.growth.readiness, 0.40 * 50 + 0.35 * 50 + 0.25 * 50);
  assert.equal(r.growth.experiments, 2);
});

test("메시지: 0.6·TypeScore + 0.4·Resonance, 2위와 8점 이내면 함께 표시", () => {
  const r = scoreAssessment(makeAnswers());
  close(r.message.score.T1, 0.6 * 75 + 0.4 * 50);
  assert.equal(r.message.rank1, "T1");
  assert.equal(r.message.rank2, "T3");
  assert.equal(r.message.coreMatch, true);
  // SS(=T2 공명)를 최대로 올리면 T2 메시지가 1위가 되어 Primary와 달라진다.
  const cross = scoreAssessment(makeAnswers({ S11: 5, S12: 1, M2: 3 }));
  close(cross.message.score.T2, 0.6 * 50 + 0.4 * 100);
  assert.equal(cross.message.rank1, "T2");
  assert.equal(cross.message.coreMatch, false);
});

test("강화: Core ≥ 50, 연결 변수 ≥ 60, 강도 ≥ 55일 때만 기록한다", () => {
  const r = scoreAssessment(makeAnswers({ S15: 5, S16: 1 }));
  assert.deepEqual(r.insights.reinforcements.map((x) => [x.core, x.linked]), [["T1", "US"]]);
  close(r.insights.reinforcements[0].strength, (75 + 100) / 2);
  assert.equal(scoreAssessment(makeAnswers()).insights.reinforcements.length, 0);
});

test("반증: Primary의 전형 신호 평균이 45 미만이면 기록한다", () => {
  assert.equal(scoreAssessment(makeAnswers()).insights.counterevidence, null);
  const r = scoreAssessment(makeAnswers({ S15: 1, S16: 5 }));
  assert.equal(r.insights.counterevidence?.core, "T1");
  close(r.insights.counterevidence!.typicalScore, 0);
});

test("표현 채널: 1순위 100, 2순위 50, 3순위 0", () => {
  const r = scoreAssessment(makeAnswers({ CH1: ["C", "A", "B"] }));
  assert.deepEqual(r.core.channel.scores, { SP: 50, SO: 0, SX: 100 });
  assert.equal(r.core.channel.primary, "SX");
});

function to100(mean: number) { return (mean - 1) / 4 * 100; }
