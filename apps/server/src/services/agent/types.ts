import { z } from "zod";

export type Speaker = "client" | "salesman";

export const PainPointItemSchema = z.object({
  painPoint: z.string(),
  category: z.string().optional().default("general"),
  severity: z.number().int().min(1).max(5),
  confidence: z.number().min(0).max(1),
  quote: z.string().optional().default("")
});
export type PainPointItem = z.infer<typeof PainPointItemSchema>;

export const PainPointsSchema = z.object({
  painPoints: z.array(PainPointItemSchema)
});
export type PainPoints = z.infer<typeof PainPointsSchema>;

export const CoachSchema = z.object({
  warnings: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  doSay: z.array(z.string()).default([]),
  dontSay: z.array(z.string()).default([]),
  citations: z.array(z.object({ title: z.string(), url: z.string().url() })).optional()
});
export type Coach = z.infer<typeof CoachSchema>;

export const ChunkSchema = z.object({
  sessionId: z.string(),
  text: z.string(),
  isFinal: z.boolean().default(true)
});
export type Chunk = z.infer<typeof ChunkSchema>;

export type AgentInsight =
  | { type: "pain_points"; speaker: "client"; sessionId: string; data: PainPoints }
  | { type: "coach"; speaker: "salesman"; sessionId: string; data: Coach }; 