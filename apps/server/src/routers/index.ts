import { Router } from "express";
import { audioRouter } from "./audio.router.js";
import { sessionsRouter } from "./sessions.router.js";
import { elevenlabsRouter } from "./elevenlabs.router.js";
import { evalRouter } from "./eval.router.js";
import { agentRouter } from "./agent.router.js";

export const appRouter: Router = Router();

// Mount audio routes
appRouter.use("/api", audioRouter);

// Mount sessions routes
appRouter.use("/api/sessions", sessionsRouter);

// Mount ElevenLabs routes
appRouter.use("/api/elevenlabs", elevenlabsRouter);

// Mount eval routes
appRouter.use("/api", evalRouter);

// Mount agent routes
appRouter.use("/api", agentRouter);

export type AppRouter = typeof appRouter;
