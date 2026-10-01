// Step 5: responses/*.json(문항 ID 키)을 앱 엔진으로 채점해 results/*.json에 저장한다.
import { existsSync, readdirSync } from "node:fs";
import { SCORING_VERSION, scoreAssessment } from "../../src/lib/scoring";
import type { Answers } from "../../src/types/assessment";
import { readJson, vpath, writeJson } from "./common";

const dir = vpath("responses");
const files = existsSync(dir) ? readdirSync(dir).filter((f) => /^p\d{2}_run\d\.json$/.test(f)).sort() : [];
for (const file of files) {
  const answers = readJson<Answers>(vpath("responses", file));
  const result = scoreAssessment(answers);
  // 재현성: 같은 입력을 두 번 채점해 같은 결과인지 확인한다.
  if (JSON.stringify(result) !== JSON.stringify(scoreAssessment(answers))) throw new Error(`재현성 실패: ${file}`);
  writeJson(vpath("results", file), result);
}
console.log(`채점 ${files.length}건 (엔진 ${SCORING_VERSION}) → ${vpath("results")}`);
