import { transcriptService } from "../transcript.service.js";
import { anthropic } from "../agent/runtime.js";
import { SYSTEM_XML as EVAL_SYSTEM_XML } from "./system.xml.js";
import prisma from "../../../prisma/index.js";

function buildRoleLabeledTranscript(client: string, sales: string): string {
  return `Client:\n${client || ""}\n\nSales:\n${sales || ""}`.trim();
}

function clampText(input: string, max = 50000): string {
  if (input.length <= max) return input;
  // keep head and tail portions
  const head = input.slice(0, Math.floor(max * 0.6));
  const tail = input.slice(-Math.floor(max * 0.4));
  return head + "\n\n...[truncated]...\n\n" + tail;
}

function extractFirstJsonObject(text: string): any {
  const cleaned = text.replace(/^```[a-zA-Z]*\n?|```$/g, "");
  const start = cleaned.indexOf("{");
  if (start === -1) return {};
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = cleaned.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return {};
        }
      }
    }
  }
  return {};
}

export async function evaluateSession(sessionId: string) {
  const session = await transcriptService.getSessionById(sessionId);
  if (!session) {
    const err: any = new Error("Session not found");
    err.status = 404;
    throw err;
  }
  if (session.status && session.status !== "ENDED") {
    const err: any = new Error("Session not ended");
    err.status = 409;
    throw err;
  }

  const client = (session.transcriptInput || "").trim();
  const sales = (session.transcriptOutput || "").trim();

  // If both empty, return empty schema-like JSON to avoid pointless LLM calls
  if (!client && !sales) {
    return {
      fillerWords: [],
      goodQuestions: [],
      badQuestions: [],
      talkRatiAndSentiment: [],
      generalStrenghts: [],
      generalWeaknesses: [],
      recommendations: [],
    };
  }

  const transcriptText = clampText(buildRoleLabeledTranscript(client, sales));

  const msg = await anthropic.messages.create({
    model: "claude-3-7-sonnet-20250219",
    max_tokens: 2000,
    temperature: 0,
    system: EVAL_SYSTEM_XML,
    messages: [{ role: "user", content: transcriptText }],
  } as any);

  const joined = (msg.content as Array<{ type: string; text?: string }>)
    .map((b) => (b.type === "text" ? b.text ?? "" : ""))
    .join("")
    .trim();

  let evalResult;
  try {
    evalResult = JSON.parse(joined);
  } catch {
    evalResult = extractFirstJsonObject(joined);
  }

  // Save evaluation to database
  try {
    await prisma.evaluation.upsert({
      where: { sessionId },
      update: {
        evalJson: evalResult,
        updatedAt: new Date(),
      },
      create: {
        sessionId,
        evalJson: evalResult,
      },
    });
  } catch (dbError) {
    console.error("Failed to save evaluation to database:", dbError);
    // Continue and return the result even if DB save fails
  }

  return evalResult;
}

export async function getEvaluationBySessionId(sessionId: string) {
  try {
    const evaluation = await prisma.evaluation.findUnique({
      where: { sessionId },
    });
    return evaluation?.evalJson || null;
  } catch (error) {
    console.error("Failed to retrieve evaluation from database:", error);
    return null;
  }
}
