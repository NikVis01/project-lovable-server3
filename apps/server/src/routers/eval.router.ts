import { Router } from "express";
import { evaluateSession } from "../services/eval/index.js";

export const evalRouter: Router = Router();

// Evaluate a completed session
// POST /api/eval/:sessionId
// 404 if session not found, 409 if not ended
// 200 with JSON body from evaluator

evalRouter.post("/eval/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await evaluateSession(sessionId);
    return res.json(result);
  } catch (error) {
    const status = (error as any)?.status || 500;
    const message = (error as Error)?.message || "Failed to evaluate session";
    console.error("Eval error:", error);
    return res.status(status).json({ error: message });
  }
}); 