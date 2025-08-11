import { createClaude } from "../runtime";
import { SYSTEM_XML } from "../prompts/system.xml";
import { COACH_SALES_XML } from "../prompts/coach_sales.xml";
import { CoachSchema } from "../types";

export async function coachSalesman(text: string, context?: string) {
  const llm = createClaude();
  const messages = [
    { role: "system" as const, content: SYSTEM_XML + "\n" + COACH_SALES_XML },
    { role: "user" as const, content: (context ? `Context:\n${context}\n\n` : "") + `Salesman:\n${text}` },
  ];
  const resp = await llm.invoke(messages);
  const raw = typeof resp.content === "string" ? resp.content : JSON.stringify(resp.content);
  return CoachSchema.parse(JSON.parse(raw));
} 