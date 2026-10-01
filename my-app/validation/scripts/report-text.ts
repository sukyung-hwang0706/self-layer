// 리포트 텍스트 공통 처리: 모든 리포트에 똑같이 들어가는 고정 섹션 제거, 문장 단위 분해.
import { readFileSync } from "node:fs";

export const SECTION_BREAK = "\n\n---\n\n";

export function readSections(path: string): string[] {
  return readFileSync(path, "utf8").replace(/\r\n/g, "\n").split(SECTION_BREAK).map((s) => s.trim()).filter(Boolean);
}

/** 주어진 리포트 묶음 전체에서 문자 그대로 같은 섹션은 개인화 정보가 없으므로 뺀다. */
export function personalSections(all: readonly string[][]): string[][] {
  if (all.length < 2) return all.map((s) => [...s]);
  const common = all[0].filter((sec) => all.every((r) => r.includes(sec)));
  return all.map((r) => r.filter((sec) => !common.includes(sec)));
}

/** 문장(또는 줄) 단위로 나눈다. 숫자는 #으로 바꿔 점수만 다른 같은 틀의 문장을 같은 문장으로 본다. */
export function sentences(text: string): string[] {
  return text
    .split("\n")
    .flatMap((line) => line.split(/(?<=[.!?。…”"])\s+/))
    .map((s) => s.trim().replace(/\d+(\.\d+)?/g, "#"))
    .filter((s) => s.length >= 12);
}
