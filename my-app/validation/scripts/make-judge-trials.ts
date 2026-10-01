// Step 6: 골라내기 테스트 시행을 만든다. 시행마다 bio 1개 + 익명 리포트 4개(정답 1 + 오답 3).
// 오답 3개 = 결과 Primary Core가 같은 다른 사람 1명(없으면 의도 Core가 같은 사람) + 무작위 2명.
// 시행 번호는 페르소나 번호와 무관하게 섞고, 정답표는 judge/key.json에만 둔다.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import type { AssessmentResult } from "../../src/types/assessment";
import { mulberry32, shuffle } from "./generators";
import { readJson, vpath, writeJson, writeText } from "./common";
import { personalSections, readSections } from "./report-text";

const SEED = 4242;
const rng = mulberry32(SEED);
const ids = readdirSync(vpath("reports")).filter((f) => /^p\d{2}_run1\.md$/.test(f)).map((f) => f.slice(0, 3)).sort();
if (ids.length < 4) throw new Error("리포트가 4개 이상 필요합니다");

const truthCore = (id: string) => readJson<{ core: { primary: string } }>(vpath("truth", `${id}_truth.json`)).core.primary;
const resultCore = (id: string) => readJson<AssessmentResult>(vpath("results", `${id}_run1.json`)).core.primary;
const sections = personalSections(ids.map((id) => readSections(vpath("reports", `${id}_run1.md`))));
const textOf = new Map(ids.map((id, i) => [id, sections[i].join("\n\n---\n\n")]));

const trialsDir = vpath("judge", "trials");
if (existsSync(trialsDir)) rmSync(trialsDir, { recursive: true, force: true });
const order = shuffle(rng, ids);
const key: Record<string, { persona: string; answer: string; options: Record<string, string>; sameCoreDistractor: string }> = {};
order.forEach((id, n) => {
  const others = ids.filter((x) => x !== id);
  const sameResult = others.filter((x) => resultCore(x) === resultCore(id));
  const sameTruth = others.filter((x) => truthCore(x) === truthCore(id));
  const pool = sameResult.length ? sameResult : sameTruth.length ? sameTruth : others;
  const near = shuffle(rng, pool)[0];
  const rest = shuffle(rng, others.filter((x) => x !== near)).slice(0, 2);
  const letters = ["A", "B", "C", "D"];
  const placed = shuffle(rng, [id, near, ...rest]);
  const trial = `t${String(n + 1).padStart(2, "0")}`;
  const dir = vpath("judge", "trials", trial);
  mkdirSync(dir, { recursive: true });
  copyFileSync(vpath("personas", `${id}_bio.md`), vpath("judge", "trials", trial, "bio.md"));
  placed.forEach((pid, i) => writeText(vpath("judge", "trials", trial, `${letters[i]}.md`), `# 리포트 ${letters[i]}\n\n${textOf.get(pid)}\n`));
  key[trial] = { persona: id, answer: letters[placed.indexOf(id)], options: Object.fromEntries(placed.map((pid, i) => [letters[i], pid])), sameCoreDistractor: near };
});
writeJson(vpath("judge", "key.json"), { seed: SEED, note: "평가자에게 보이지 않는 정답표", trials: key });
console.log(`시행 ${order.length}개 → ${trialsDir}`);
