import { createClaude } from "../runtime";
import { SYSTEM_XML } from "../prompts/system.xml";
import { PAIN_POINTS_XML } from "../prompts/pain_points.xml";
import { PainPointsSchema } from "../types";

export async function flagPainPoints(text: string) {
  const llm = createClaude();
  const messages = [
    { role: "system" as const, content: SYSTEM_XML + "\n" + PAIN_POINTS_XML },
    { role: "user" as const, content: text },
  ];
  const resp = await llm.invoke(messages);
  const raw = typeof resp.content === "string" ? resp.content : JSON.stringify(resp.content);
  return PainPointsSchema.parse(JSON.parse(raw));
} 