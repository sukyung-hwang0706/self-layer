import { ITEM_BANK_VERSION, PART1 } from "../data/items";
import { VALUE_CODES, type Scores, type ValueCode } from "../types/assessment";

/**
 * 가치 점수 보정(B안: 결합 점수 표준화). 앱 임시 규칙이며 설계서 원문 규칙이 아니다. 근거: docs/drafts/value-scoring-candidates.md
 * 보정값(가치별 무작위 응답 평균·표준편차)은 검증 스크립트가 미리 산출한 고정 데이터이며, 앱은 실행 중에 무작위값을 쓰지 않는다.
 * 보정값은 그것을 만든 문항 배치에만 유효하다. 배치 지문이 다르면 조용히 쓰지 않고 오류를 낸다.
 */
export const VALUE_CALIBRATION_METHOD = "combined-zscore-v1";

/** 설계서 10.3 Value 결합 비중과 4장의 문항 안 같은 Value 득점 상한. 보정값의 배치 지문에 들어가므로 이 모듈에 둔다. */
export const VALUE_WEIGHTS = { selection: 0.6, diversity: 0.4 } as const;
export const VALUE_ITEM_CAP = 2;

/** 잠정 근접 기준: 최고 보정 점수와의 차이가 이 값 이하이면 공동 순위로 본다. 검증된 동점 기준이 아니다. */
export const VALUE_TIE_TOLERANCE = 0.05;

export interface ValueCalibration {
  method: string;
  /** 보정값을 만든 문항 배치의 지문 */
  fingerprint: string;
  itemBankVersion: string;
  /** 보정용 무작위 응답 시드와 표본 수(재현용 기록) */
  seed: number;
  samples: number;
  mean: Scores<ValueCode>;
  sd: Scores<ValueCode>;
}

export class ValueCalibrationMismatchError extends Error {
  constructor(public readonly reasons: string[]) { super(`가치 보정값이 현재 문항 배치와 맞지 않습니다: ${reasons.join("; ")}`); }
}

function fnv1a(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/** 가치 점수에 영향을 주는 모든 요소(문항 버전, Part 1의 맥락·보기 키·가치 태그, 배점 상한, 결합 비중, 보정 방식)의 지문. */
export function valueLayoutDescriptor(): string {
  const items = PART1.map((i) => `${i.id}:${i.context}:${i.options.map((o) => `${o.key}=${o.value}`).join(",")}`).join("|");
  return [
    `bank=${ITEM_BANK_VERSION}`, `method=${VALUE_CALIBRATION_METHOD}`, `cap=${VALUE_ITEM_CAP}`,
    `weights=${VALUE_WEIGHTS.selection}/${VALUE_WEIGHTS.diversity}`, `values=${VALUE_CODES.join(",")}`, items,
  ].join("#");
}
export const valueLayoutFingerprint = () => fnv1a(valueLayoutDescriptor());

export function assertCalibration(cal: ValueCalibration): void {
  const reasons: string[] = [];
  if (cal.method !== VALUE_CALIBRATION_METHOD) reasons.push(`보정 방식 ${cal.method} ≠ ${VALUE_CALIBRATION_METHOD}`);
  if (cal.itemBankVersion !== ITEM_BANK_VERSION) reasons.push(`문항 버전 ${cal.itemBankVersion} ≠ ${ITEM_BANK_VERSION}`);
  if (cal.fingerprint !== valueLayoutFingerprint()) reasons.push(`배치 지문 ${cal.fingerprint} ≠ ${valueLayoutFingerprint()}`);
  for (const v of VALUE_CODES) {
    if (!Number.isFinite(cal.mean[v])) reasons.push(`${v} 평균 없음`);
    if (!(cal.sd[v] > 0)) reasons.push(`${v} 표준편차가 0 이하`);
  }
  if (reasons.length) throw new ValueCalibrationMismatchError(reasons);
}

/** 결합 점수를 가치별 무작위 응답 평균·표준편차로 표준화한다. 숫자는 "무작위 응답 분포에서의 위치"이며 사람 간 백분위가 아니다. */
export function standardizeValues(score: Scores<ValueCode>, cal: ValueCalibration): Scores<ValueCode> {
  assertCalibration(cal);
  return Object.fromEntries(VALUE_CODES.map((v) => [v, (score[v] - cal.mean[v]) / cal.sd[v]])) as Scores<ValueCode>;
}

export interface CalibratedValueRanking {
  /** 보정 점수 내림차순. 같은 점수의 순서는 의미가 없으므로 first·top3로 공동 여부를 판단한다. */
  ranking: ValueCode[];
  /** 최고 보정 점수와의 차이가 허용폭 이하인 가치(공동 1위). 최고점 기준으로만 비교해 연쇄 포함하지 않는다. */
  first: ValueCode[];
  /** 3위 보정 점수보다 허용폭 넘게 높은 가치 + 3위 점수와의 차이가 허용폭 이하인 가치. 경계 공동이면 3개를 넘을 수 있다. */
  top3: ValueCode[];
  /** 상위 3 경계에서 자리보다 후보가 많은지 */
  boundaryTied: boolean;
}

/** 부동소수 오차 흡수용. 허용폭 경계(정확히 0.05 차이)를 포함하기 위한 것이며 판정 기준을 넓히지 않는다. */
const FLOAT_EPS = 1e-9;

export function rankCalibrated(z: Scores<ValueCode>, tolerance = VALUE_TIE_TOLERANCE): CalibratedValueRanking {
  const tol = tolerance + FLOAT_EPS;
  const ranking = [...VALUE_CODES].sort((a, b) => z[b] - z[a]);
  const max = z[ranking[0]], third = z[ranking[2]];
  const first = ranking.filter((v) => max - z[v] <= tol);
  const above = ranking.filter((v) => z[v] - third > tol);
  const atBoundary = ranking.filter((v) => Math.abs(z[v] - third) <= tol);
  return { ranking, first, top3: [...above, ...atBoundary], boundaryTied: above.length + atBoundary.length > 3 };
}

/**
 * 8개 가치 전체의 공동 순위. 그룹의 첫 가치(가장 높은 보정 점수)와의 차이가 허용폭 이하인 가치를 같은 순위로 묶는다.
 * 그룹 기준점과만 비교하므로 연쇄로 묶이지 않는다. 순위 번호는 앞선 가치 수 + 1(예: 공동 1위가 둘이면 다음은 3위).
 */
export function rankGroups(z: Scores<ValueCode>, tolerance = VALUE_TIE_TOLERANCE): { rank: Scores<ValueCode>; groups: ValueCode[][] } {
  const tol = tolerance + FLOAT_EPS;
  const ordered = [...VALUE_CODES].sort((a, b) => z[b] - z[a]);
  const groups: ValueCode[][] = [];
  for (const v of ordered) {
    const g = groups[groups.length - 1];
    if (g && z[g[0]] - z[v] <= tol) g.push(v); else groups.push([v]);
  }
  const rank = {} as Scores<ValueCode>;
  let before = 0;
  for (const g of groups) { for (const v of g) rank[v] = before + 1; before += g.length; }
  return { rank, groups };
}
