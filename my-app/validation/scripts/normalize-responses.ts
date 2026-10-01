// responses/raw/*.json(응답자 출력, Q01~Q76 키)을 검증해 responses/*.json(문항 ID 키)으로 바꾼다.
// 사용: node validation/run.mjs normalize-responses [파일명 필터]
import { existsSync, readdirSync } from "node:fs";
import { basename } from "node:path";
import { isValidAnswer, missingItems } from "../../src/lib/scoring";
import type { Answer } from "../../src/types/assessment";
import { NEUTRAL_TO_ITEM, readJson, vpath, writeJson } from "./common";

const rawDir = vpath("responses", "raw");
const filter = process.argv[2] ?? "";
const files = existsSync(rawDir) ? readdirSync(rawDir).filter((f) => f.endsWith(".json") && !f.endsWith("_ux.json") && f.includes(filter)).sort() : [];
if (files.length === 0) {
  console.log(`정규화할 파일이 없습니다: ${rawDir}`);
  process.exit(0);
}

let failed = 0;
for (const file of files) {
  const problems: string[] = [];
  let raw: Record<string, unknown> = {};
  try {
    const parsed = readJson(vpath("responses", "raw", file));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("객체가 아님");
    raw = parsed as Record<string, unknown>;
  } catch (error) {
    problems.push(`JSON 읽기 실패: ${(error as Error).message}`);
  }
  const answers: Record<string, Answer> = {};
  for (const [key, value] of Object.entries(raw)) {
    const itemId = NEUTRAL_TO_ITEM.get(key);
    if (!itemId) problems.push(`알 수 없는 키 ${key}`);
    else if (!isValidAnswer(itemId, value)) problems.push(`${key} 응답 형식 오류: ${JSON.stringify(value)}`);
    else answers[itemId] = value;
  }
  const missing = missingItems(answers);
  if (missing.length > 0 && problems.length === 0) problems.push(`미응답 ${missing.length}개`);
  if (problems.length > 0) {
    failed += 1;
    console.log(`✗ ${file}: ${problems.slice(0, 5).join("; ")}${problems.length > 5 ? ` 외 ${problems.length - 5}건` : ""}`);
    continue;
  }
  writeJson(vpath("responses", basename(file)), answers);
  console.log(`✓ ${file}`);
}
console.log(`완료: 성공 ${files.length - failed} / 실패 ${failed}`);
process.exitCode = failed > 0 ? 1 : 0;
