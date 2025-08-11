import type { Chunk, AgentInsight } from "./types";
import { flagPainPoints } from "./tools/flagPainPoints";
import { coachSalesman } from "./tools/coachSalesman";

export class AgentService {
  async processClientChunk(chunk: Chunk): Promise<AgentInsight | null> {
    if (!chunk.isFinal || !chunk.text.trim()) return null;
    const data = await flagPainPoints(chunk.text);
    return { type: "pain_points", speaker: "client", sessionId: chunk.sessionId, data };
  }

  async processSalesmanChunk(chunk: Chunk, context?: string): Promise<AgentInsight | null> {
    if (!chunk.isFinal || !chunk.text.trim()) return null;
    const data = await coachSalesman(chunk.text, context);
    return { type: "coach", speaker: "salesman", sessionId: chunk.sessionId, data };
  }
}

export const agentService = new AgentService(); 