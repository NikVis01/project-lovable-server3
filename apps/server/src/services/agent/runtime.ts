import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ClaudeMessage = {
  role: "user" | "assistant";
  content:
    | string
    | Array<{ type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: unknown }>;
};

const WEB_SEARCH_TOOL = {
  name: "web_search",
  description: "Search the web to retrieve recent information and citations.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: { type: "string" as const },
      k: { type: "integer" as const, minimum: 1, maximum: 8 },
    },
    required: ["query"] as string[],
  },
} as const;

async function runWebSearch(input: { query: string; k?: number }) {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return { citations: [], summary: "" };
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, query: input.query, max_results: input.k ?? 5 }),
    });
    if (!res.ok) return { citations: [], summary: "" };
    const data = (await res.json()) as { results?: Array<{ title?: string; url: string }>; answer?: string };
    return {
      citations: (data.results ?? []).map((r) => ({ title: r.title || r.url, url: r.url })),
      summary: data.answer || "",
    };
  } catch {
    return { citations: [], summary: "" };
  }
}

export async function callClaudeJSON(params: {
  system: string;
  messages: ClaudeMessage[];
  model?: string;
  temperature?: number;
}) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is required");

  const model = params.model ?? "claude-3-7-sonnet-latest";

  let msg = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    temperature: params.temperature ?? 0,
    system: params.system,
    tools: [WEB_SEARCH_TOOL as any],
    messages: params.messages,
  } as any);

  const toolUses = (msg.content as Array<any>).filter((b) => b.type === "tool_use");
  if (toolUses.length > 0) {
    const toolResults = await Promise.all(
      toolUses.map(async (tu: { id: string; name: string; input: any }) => {
        if (tu.name === WEB_SEARCH_TOOL.name) {
          const result = await runWebSearch({ query: String(tu.input?.query || ""), k: tu.input?.k });
          return { type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result) };
        }
        return { type: "tool_result", tool_use_id: tu.id, content: "{}" };
      })
    );

    msg = await anthropic.messages.create({
      model,
      max_tokens: 2000,
      temperature: params.temperature ?? 0,
      system: params.system,
      tools: [WEB_SEARCH_TOOL as any],
      messages: [
        ...params.messages,
        { role: "assistant", content: msg.content as any },
        { role: "user", content: toolResults as any },
      ],
    } as any);
  }

  const blocks = msg.content as Array<{ type: string; text?: string }>;
  const text = blocks.map((b) => (b.type === "text" ? b.text ?? "" : "")).join("").trim();
  return text;
} 