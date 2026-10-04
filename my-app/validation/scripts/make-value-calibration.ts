// 가치 보정값(B안) 산출: 현재 문항 배치에서 무작위 응답의 가치별 결합 점수 평균·표준편차를 구해 src/data/value-calibration.ts로 쓴다.
// 문항 배치·가치 태그·맥락·결합 비중·보정 방식이 바뀌면 다시 실행한다. 앱은 실행 중에 무작위값을 쓰지 않는다.
// 사용: node validation/run.mjs make-value-calibration [표본 수=20000] [시드=777001]
import { writeFileSync } from "node:fs";
import { ITEM_BANK_VERSION } from "../../src/data/items";
import { scoreUncalibrated } from "../../src/lib/scoring";
import { VALUE_CALIBRATION_METHOD, valueLayoutFingerprint } from "../../src/lib/value-calibration";
import { VALUE_CODES, type ValueCode } from "../../src/types/assessment";
import { generate, mulberry32 } from "./generators";

const N = Number(process.argv[2] ?? 20000);
const SEED = Number(process.argv[3] ?? 777001);
const rng = mulberry32(SEED);
const xs = Object.fromEntries(VALUE_CODES.map((v) => [v, [] as number[]])) as Record<ValueCode, number[]>;
for (let k = 0; k < N; k++) {
  const { values } = scoreUncalibrated(generate("uniform", rng));
  for (const v of VALUE_CODES) xs[v].push(values.score[v]);
}
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const m = Object.fromEntries(VALUE_CODES.map((v) => [v, mean(xs[v])])) as Record<ValueCode, number>;
const sd = Object.fromEntries(VALUE_CODES.map((v) => [v, Math.sqrt(mean(xs[v].map((x) => (x - m[v]) ** 2)))])) as Record<ValueCode, number>;
const fmt = (r: Record<ValueCode, number>) => `{ ${VALUE_CODES.map((v) => `${v}: ${r[v]}`).join(", ")} }`;

const out = `import type { ValueCalibration } from "../lib/value-calibration";

/**
 * 가치 보정값(B안). 자동 생성 파일이며 직접 고치지 않는다.
 * 생성: npm.cmd run validate -- make-value-calibration ${N} ${SEED}
 * 무작위 응답(uniform) ${N}세트의 가치별 결합 점수 평균·표준편차다. 실제 사람 분포가 아니다.
 * 문항 배치가 바뀌어 지문이 맞지 않으면 채점이 오류를 낸다(src/lib/value-calibration.ts).
 */
export const VALUE_CALIBRATION: ValueCalibration = {
  method: "${VALUE_CALIBRATION_METHOD}",
  fingerprint: "${valueLayoutFingerprint()}",
  itemBankVersion: "${ITEM_BANK_VERSION}",
  seed: ${SEED},
  samples: ${N},
  mean: ${fmt(m)},
  sd: ${fmt(sd)},
};
`;
writeFileSync("src/data/value-calibration.ts", out);
console.log(`가치 보정값 → src/data/value-calibration.ts (문항 ${ITEM_BANK_VERSION}, 지문 ${valueLayoutFingerprint()}, ${N}세트, 시드 ${SEED})`);
