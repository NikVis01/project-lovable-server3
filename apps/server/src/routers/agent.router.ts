import { Router } from "express";
import { transcriptService } from "../services/transcript.service.js";
import { agentService } from "../services/agent/index.js";

export const agentRouter: Router = Router();

// Analyze a session's transcripts with the agent
agentRouter.post("/analyze/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await transcriptService.getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const client = (session.transcriptInput || "").trim();
    const salesman = (session.transcriptOutput || "").trim();

    // If nothing to analyze, return thin payload (UI will show no-op)
    if (!client && !salesman) {
      return res.json({ sessionId: session.id });
    }

    // Agent requires non-empty inputs; provide minimal placeholders where missing
    const safeClient = client || "N/A";
    const safeSalesman = salesman || "N/A";

    const out = await agentService.processConversation({
      sessionId: session.id,
      client: safeClient,
      salesman: safeSalesman,
    });

    return res.json(out);
  } catch (error) {
    console.error("Agent analyze error:", error);
    return res.status(500).json({
      error: "Failed to analyze session",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}); 