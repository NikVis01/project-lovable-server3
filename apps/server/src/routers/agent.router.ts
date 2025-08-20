import { Router } from "express";
import { transcriptService } from "../services/transcript.service.js";
import { agentService } from "../services/agent/index.js";
import { createHash } from "crypto";

export const agentRouter: Router = Router();

// Check if session content has changed (for avoiding duplicate agent calls)
agentRouter.get("/analyze/:sessionId/check-content", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await transcriptService.getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const salesman = (session.transcriptInput || "").trim();
    const client = (session.transcriptOutput || "").trim();
    const combinedContent = `${salesman}\n---\n${client}`;
    
    // Create a hash of the content to track changes
    const contentHash = createHash('md5').update(combinedContent).digest('hex');
    const contentLength = combinedContent.length;

    return res.json({ 
      contentHash, 
      contentLength,
      hasContent: salesman.length > 0 || client.length > 0,
      lastUpdated: session.updatedAt
    });
  } catch (error) {
    console.error("Content check error:", error);
    return res.status(500).json({
      error: "Failed to check content",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Analyze a session's transcripts with the agent
agentRouter.post("/analyze/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await transcriptService.getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const salesman = (session.transcriptInput || "").trim();
    const client = (session.transcriptOutput || "").trim();

    // If nothing to analyze, return meaningful guidance
    if (!client && !salesman) {
      return res.json({ 
        sessionId: session.id,
        message: "No conversation content available yet. Waiting for speech input...",
        hasContent: false,
        timestamp: new Date().toISOString()
      });
    }

    // Only process if there's meaningful content
    if (salesman.length < 10 && client.length < 10) {
      return res.json({ 
        sessionId: session.id,
        message: "Conversation just started. Gathering more content for analysis...",
        hasContent: true,
        contentLength: salesman.length + client.length,
        timestamp: new Date().toISOString()
      });
    }

    // Process with agent - ensure both inputs are meaningful
    const safeClient = client || "N/A";
    const safeSalesman = salesman || "N/A";

    console.log(`[Agent] Processing conversation with ${salesman.length} chars from salesman, ${client.length} chars from client`);

    const out = await agentService.processConversation({
      sessionId: session.id,
      client: safeClient,
      salesman: safeSalesman,
    });

    // Ensure the response includes metadata
    return res.json({
      ...out,
      hasContent: true,
      contentLength: salesman.length + client.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Agent analyze error:", error);
    return res.status(500).json({
      error: "Failed to analyze session",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}); 