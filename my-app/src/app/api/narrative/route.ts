import Anthropic from "@anthropic-ai/sdk";
import { buildNarrativeInput, NARRATIVE_SCHEMA, NARRATIVE_SYSTEM, NARRATIVE_VERSION, narrativePrompt, validateNarrative } from "../../../lib/narrative";
import { missingItems, scoreAssessment, SCORING_VERSION } from "../../../lib/scoring";
import type { Answers } from "../../../types/assessment";

const MODEL = "claude-opus-5";

/**
 * POST { answers } → { narrative, rejected }.
 * 점수는 서버에서 다시 계산한다(클라이언트가 보낸 점수는 받지 않는다). 모델에는 확정된 사실만 보내고
 * 원응답·이름은 보내지 않는다. 실패하면 오류를 돌려주고 화면은 기본 문장을 유지한다.
 */
export async function POST(request: Request) {
  let answers: Answers;
  try {
    const body = await request.json();
    answers = body?.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers) || missingItems(answers).length) throw new Error();
  } catch {
    return Response.json({ error: "invalid_answers" }, { status: 400 });
  }

  const input = buildNarrativeInput(scoreAssessment(answers));
  let client: Anthropic;
  try {
    client = new Anthropic();
  } catch {
    return Response.json({ error: "ai_unavailable" }, { status: 503 });
  }

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: NARRATIVE_SYSTEM,
      output_config: { format: { type: "json_schema", schema: NARRATIVE_SCHEMA } },
      messages: [{ role: "user", content: narrativePrompt(input) }],
    });
    if (response.stop_reason === "refusal") return Response.json({ error: "refused" }, { status: 502 });
    if (response.stop_reason === "max_tokens") return Response.json({ error: "truncated" }, { status: 502 });
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { return Response.json({ error: "invalid_output" }, { status: 502 }); }
    const { narrative, rejected } = validateNarrative(parsed, input);
    if (rejected.length) console.warn("[narrative] rejected fields", rejected);
    return Response.json({ narrative, rejected, model: response.model, version: NARRATIVE_VERSION, scoring: SCORING_VERSION });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return Response.json({ error: "ai_unavailable" }, { status: 503 });
    if (error instanceof Anthropic.RateLimitError) return Response.json({ error: "rate_limited" }, { status: 429 });
    if (error instanceof Anthropic.APIError) return Response.json({ error: "ai_error" }, { status: 502 });
    if (error instanceof Error && /api key|apiKey|authToken|credentials/i.test(error.message)) return Response.json({ error: "ai_unavailable" }, { status: 503 });
    console.error("[narrative]", error);
    return Response.json({ error: "ai_error" }, { status: 502 });
  }
}
