import { Router } from "express";
import { audioRouter } from "./audio.router.js";
import { sessionsRouter } from "./sessions.router.js";

export const appRouter: Router = Router();

// Mount audio routes
appRouter.use("/api", audioRouter);

// Mount sessions routes
appRouter.use("/api/sessions", sessionsRouter);

export type AppRouter = typeof appRouter;
