import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ClaudeMessage = { role: "user" | "assistant"; content: string };

// Minimal wrapper that enables Claude-native web search
export async function callClaudeJSON(params: {
  system: string;
  messages: ClaudeMessage[];
  model?: string;
  temperature?: number;
}) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is required");

  // Use a model that supports web search per Anthropic docs
  const model = params.model ?? "claude-3-7-sonnet-20250219";

  const msg = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    temperature: params.temperature ?? 0,
    system: params.system,
    // Enable Claude-native web search. Claude decides when to search.
    tools: [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: 3,
        // Optionally restrict domains or localize via user_location here.
        // allowed_domains: ["example.com"],
        // blocked_domains: ["untrustedsource.com"],
        // user_location: { type: "approximate", city: "San Francisco", region: "California", country: "US", timezone: "America/Los_Angeles" }
      } as any,
    ],
    messages: params.messages,
  } as any);

  // Join final text blocks. Search blocks are included in content but we only need the final text JSON.
  const blocks = msg.content as Array<{ type: string; text?: string }>;
  const text = blocks.map((b) => (b.type === "text" ? b.text ?? "" : "")).join("").trim();
  return text;
} 