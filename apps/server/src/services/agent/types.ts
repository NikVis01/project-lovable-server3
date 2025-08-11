import { z } from "zod";

// Inputs: required
export const AgentInputSchema = z.object({
  sessionId: z.string().min(1),
  client: z.string().min(1),
  salesman: z.string().min(1),
});
export type AgentInput = z.infer<typeof AgentInputSchema>;

// Thin outputs
export const WebSearchSchema = z.object({
  citations: z
    .array(z.object({ title: z.string(), url: z.string().url() }))
    .min(1),
  summary: z.string().optional().nullable(),
});
export type WebSearch = z.infer<typeof WebSearchSchema>;

export const CoachSchema = z
  .object({
    warnings: z.array(z.string()).optional().default([]),
    suggestions: z.array(z.string()).optional().default([]),
    doSay: z.array(z.string()).optional().default([]),
    dontSay: z.array(z.string()).optional().default([]),
  })
  .refine(
    (o) => (o.warnings?.length || 0) + (o.suggestions?.length || 0) + (o.doSay?.length || 0) + (o.dontSay?.length || 0) > 0,
    { message: "coach must contain at least one non-empty list" }
  );
export type Coach = z.infer<typeof CoachSchema>;

export const PainPointsSchema = z.object({
  painPoints: z.array(z.string()).min(1),
});
export type PainPoints = z.infer<typeof PainPointsSchema>;

// One-of output: exactly one populated
export const AgentOutputOneOfSchema = z
  .object({
    sessionId: z.string(),
    web_search: WebSearchSchema.optional().nullable(),
    coach: CoachSchema.optional().nullable(),
    pain_points: PainPointsSchema.optional().nullable(),
  })
  .refine((o) => {
    const present = [
      o.web_search ? 1 : 0,
      o.coach ? 1 : 0,
      o.pain_points ? 1 : 0,
    ].reduce((a, b) => a + b, 0);
    return present === 1;
  }, { message: "exactly one of web_search | coach | pain_points must be returned" });
export type AgentOutput = z.infer<typeof AgentOutputOneOfSchema>;

export type InsightKind = "web_search" | "coach" | "pain_points";
export function getInsightKind(o: AgentOutput): InsightKind | null {
  if (o.web_search) return "web_search";
  if (o.coach) return "coach";
  if (o.pain_points) return "pain_points";
  return null;
} 