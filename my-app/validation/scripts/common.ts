import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DISPLAY_ORDER } from "../../src/data/items";

/** 모든 경로는 my-app 기준이다(run.mjs가 cwd를 my-app으로 둔다). */
export const VALIDATION_DIR = "validation";
export const vpath = (...parts: string[]) => join(VALIDATION_DIR, ...parts);

/**
 * 응답자에게는 문항 ID(A1, S3, ST2 …) 대신 화면 순서 번호(Q01~Q76)만 보여준다.
 * ID 접두어가 측정 영역(애착·스키마·스트레스)을 드러내기 때문이다.
 */
export const neutralId = (index: number) => `Q${String(index + 1).padStart(2, "0")}`;
export const NEUTRAL_TO_ITEM: ReadonlyMap<string, string> = new Map(DISPLAY_ORDER.map((id, i) => [neutralId(i), id]));
export const ITEM_TO_NEUTRAL: ReadonlyMap<string, string> = new Map(DISPLAY_ORDER.map((id, i) => [id, neutralId(i)]));

export function writeText(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf8");
}

export function writeJson(path: string, data: unknown) {
  writeText(path, `${JSON.stringify(data, null, 2)}\n`);
}

export function readJson<T = unknown>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8").replace(/^﻿/, "")) as T;
}
