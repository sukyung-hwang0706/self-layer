import type { ValueCalibration } from "../lib/value-calibration";

/**
 * 가치 보정값(B안). 자동 생성 파일이며 직접 고치지 않는다.
 * 생성: npm.cmd run validate -- make-value-calibration 20000 777001
 * 무작위 응답(uniform) 20000세트의 가치별 결합 점수 평균·표준편차다. 실제 사람 분포가 아니다.
 * 문항 배치가 바뀌어 지문이 맞지 않으면 채점이 오류를 낸다(src/lib/value-calibration.ts).
 */
export const VALUE_CALIBRATION: ValueCalibration = {
  method: "combined-zscore-v1",
  fingerprint: "5463afe5",
  itemBankVersion: "1.2-app",
  seed: 777001,
  samples: 20000,
  mean: { ACH: 47.73333333333392, AUT: 48.19968333333286, REL: 46.689500000000336, SEC: 47.13759999999945, GROW: 48.5616375, AUTH: 44.45726190476233, CONTR: 48.506425, EXP: 49.41473333333301 },
  sd: { ACH: 15.077798247754457, AUT: 14.327288605616198, REL: 14.849355795043442, SEC: 14.152809285948859, GROW: 16.046273833622397, AUTH: 14.812012269398188, CONTR: 16.077622724438665, EXP: 14.910868393967233 },
};
