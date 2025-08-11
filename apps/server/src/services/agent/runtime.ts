import { ChatAnthropic } from "@langchain/anthropic";

export function createClaude(model: string = "claude-3-7-sonnet-latest") {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is required");
  return new ChatAnthropic({ apiKey, model });
} 