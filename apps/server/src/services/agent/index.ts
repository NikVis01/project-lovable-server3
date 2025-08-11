import { AgentInputSchema, type AgentInput, AgentOutputOneOfSchema, type AgentOutput } from "./types";
import { SYSTEM_XML } from "./prompts/system.xml";
import { callClaudeJSON } from "./runtime";

function buildUserBlock(input: AgentInput) {
  return `Session: ${input.sessionId}\n\nClient:\n${input.client}\n\nSalesman:\n${input.salesman}`;
}

function extractFirstJsonObject(text: string): any {
  const cleaned = text.replace(/^```[a-zA-Z]*\n?|```$/g, "");
  let start = cleaned.indexOf("{");
  if (start === -1) return {};
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = cleaned.slice(start, i + 1);
        return JSON.parse(slice);
      }
    }
  }
  return {};
}

export class AgentService {
  async processConversation(input: AgentInput): Promise<AgentOutput> {
    const parsed = AgentInputSchema.parse(input);

    const raw = await callClaudeJSON({
      system: SYSTEM_XML,
      messages: [{ role: "user", content: buildUserBlock(parsed) }],
      temperature: 0,
    });

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      json = extractFirstJsonObject(raw);
    }

    const output = AgentOutputOneOfSchema.parse({ sessionId: parsed.sessionId, ...(json as object) });
    return output;
  }
}

export const agentService = new AgentService(); 