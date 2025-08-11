import { Router } from "express";
import { transcriptService } from "../services/transcript.service.js";

export const sessionsRouter: Router = Router();

// API endpoint to get all sessions with recordings
sessionsRouter.get("/", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const sessions = await transcriptService.getSessionsWithRecordings(
      limit,
      offset
    );

    res.json({
      sessions,
      total: sessions.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({
      error: "Failed to fetch sessions",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// API endpoint to get a specific session
sessionsRouter.get("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await transcriptService.getSessionById(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({
      error: "Failed to fetch session",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// API endpoint to delete a session
sessionsRouter.delete("/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // First check if session exists
    const session = await transcriptService.getSessionById(sessionId);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Delete the session
    await transcriptService.deleteSession(sessionId);

    res.json({
      success: true,
      message: "Session deleted successfully",
      sessionId,
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({
      error: "Failed to delete session",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
