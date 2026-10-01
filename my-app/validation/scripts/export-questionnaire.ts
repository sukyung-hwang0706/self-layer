// 응답자용 문항지를 만든다. 측정 코드·역채점·선택지의 유형/가치·채널은 넣지 않는다.
import { DISPLAY_ORDER, ITEM_BANK_VERSION, ITEM_BY_ID, LIKERT_LABELS, PARTS } from "../../src/data/items";
import { neutralId, vpath, writeText } from "./common";

const lines: string[] = [
  "# 자기이해 검사 응답지",
  "",
  `문항 ${DISPLAY_ORDER.length}개 · 문항지 버전 ${ITEM_BANK_VERSION}`,
  "",
  "## 응답 방법",
  "",
  "- 정답은 없습니다. 주어진 인물이라면 실제로 어떻게 답할지를 기준으로 고르세요.",
  "- 모든 문항에 답하세요. 응답은 아래 JSON 형식 하나로만 제출합니다.",
  "- 선택 문항: `{\"first\": \"A\", \"second\": \"C\"}` — 1순위와 2순위는 서로 달라야 합니다.",
  `- 5점 문항: 1~5 정수 (${LIKERT_LABELS.map((label, i) => `${i + 1} ${label}`).join(" · ")})`,
  "- 순위 문항: `[\"B\", \"A\", \"C\"]` — 가까운 순서대로 세 개 모두.",
  "",
  "```json",
  "{ \"Q01\": {\"first\": \"A\", \"second\": \"C\"}, \"Q19\": 4, \"Q76\": [\"B\", \"A\", \"C\"] }",
  "```",
];

let currentPart = 0;
let currentLead: string | undefined;
DISPLAY_ORDER.forEach((id, index) => {
  const item = ITEM_BY_ID.get(id);
  if (!item) throw new Error(`문항 없음: ${id}`);
  const q = neutralId(index);
  if (item.part !== currentPart) {
    currentPart = item.part;
    currentLead = undefined;
    const part = PARTS.find((p) => p.part === item.part);
    if (!part) throw new Error(`Part 정보 없음: ${item.part}`);
    lines.push("", `## Part ${part.part} · ${part.title}`, "", `**${part.question}**`, "", part.instruction, "");
  }
  if (item.kind === "choice") {
    lines.push(`### ${q}`, item.stem, ...item.options.map((o) => `- ${o.key}. ${o.text}`), "");
  } else if (item.kind === "rank") {
    lines.push(`### ${q}`, item.stem, ...item.options.map((o) => `- ${o.key}. ${o.text}`), "");
  } else {
    if (item.lead !== currentLead) {
      // 공통 문장이 바뀌거나 끝나면 앞 묶음과 분리해 문장이 이어서 적용되는 것처럼 보이지 않게 한다.
      if (currentLead !== undefined) lines.push("", "---", "");
      currentLead = item.lead;
      if (item.lead) lines.push(`_${item.lead}_`, "");
    }
    lines.push(`- **${q}** ${item.text}`);
  }
});

const out = vpath("questionnaire.md");
writeText(out, `${lines.join("\n").replace(/\n{3,}/g, "\n\n")}\n`);
console.log(`${out} 작성 (${DISPLAY_ORDER.length}문항)`);
