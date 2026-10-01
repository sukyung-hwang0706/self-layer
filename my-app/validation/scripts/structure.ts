// Step 2 보조: 문항 은행의 구조(가치 노출 수·맥락 수, 선택지 위치별 유형 배치, 코드별 문항 수)를 표로 만든다.
import { PART1, PART3, PART4, PART5, PART2 } from "../../src/data/items";
import { CORE } from "../../src/data/content";
import { CORE_TYPES, VALUE_CODES, type CoreType } from "../../src/types/assessment";
import { vpath, writeText } from "./common";

const lines = ["# 문항 은행 구조", "", "## Part 1 가치 노출", "", "| Value | 등장 선택지 수 | 등장 문항 수 | 같은 문항 중복 | 등장 맥락 수 | 1·2순위 상한(문항당 2점) |", "|---|---:|---:|---:|---:|---:|"];
for (const v of VALUE_CODES) {
  const options = PART1.flatMap((i) => i.options.filter((o) => o.value === v).map(() => i));
  const items = new Set(options.map((i) => i.id));
  const contexts = new Set(options.map((i) => i.context));
  const dup = [...items].filter((id) => options.filter((i) => i.id === id).length > 1);
  lines.push(`| ${v} | ${options.length} | ${items.size} | ${dup.join(", ") || "-"} | ${contexts.size} | ${items.size * 2} |`);
}

lines.push("", "## Part 1 선택지 위치별 Core 배치", "", "| 위치 | " + CORE_TYPES.map((t) => CORE[t].name).join(" | ") + " |", "|---|" + CORE_TYPES.map(() => "---:").join("|") + "|");
for (const pos of [0, 1, 2, 3] as const) {
  const count = (t: CoreType) => PART1.filter((i) => i.options[pos].type === t).length;
  lines.push(`| ${"ABCD"[pos]} | ${CORE_TYPES.map(count).join(" | ")} |`);
}
lines.push("", "## Part 1 선택지 위치별 Value 배치", "", "| 위치 | " + VALUE_CODES.join(" | ") + " |", "|---|" + VALUE_CODES.map(() => "---:").join("|") + "|");
for (const pos of [0, 1, 2, 3] as const) {
  lines.push(`| ${"ABCD"[pos]} | ${VALUE_CODES.map((v) => PART1.filter((i) => i.options[pos].value === v).length).join(" | ")} |`);
}

lines.push("", "## 5점 문항 코드별 문항 수 (역채점 수)", "", "| Part | 코드: 문항 수(역) |", "|---|---|");
for (const [part, items] of [[2, PART2], [3, PART3], [4, PART4], [5, PART5]] as const) {
  const codes = [...new Set(items.map((i) => i.code))];
  lines.push(`| ${part} | ${codes.map((c) => `${c}: ${items.filter((i) => i.code === c).length}(${items.filter((i) => i.code === c && i.reverse).length})`).join(" · ")} |`);
}
lines.push("", "문항이 2개인 코드의 평균은 1–5 응답에서 9가지 값(0, 12.5 … 100)만 가지므로 동점이 잦다. 동점은 정의 순서로 정렬된다(`rankBy`).");

writeText(vpath("analysis", "structure.md"), `${lines.join("\n")}\n`);
console.log(lines.join("\n"));
