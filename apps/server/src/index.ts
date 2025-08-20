import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { SpeechService } from "./services/speech.service.js";
import { transcriptService } from "./services/transcript.service.js";
import { appRouter } from "./routers/index.js";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth";
import { evalRouter } from "./routers/eval.router.js";

const app = express();
const server = createServer(app);

// Parse CORS origins from environment or use defaults
const getCorsOrigins = () => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
  }
  return [
    "http://localhost:3001",
    "http://localhost:8080",
    "https://project-lovable-server3.onrender.com",
  ];
};

const corsOrigins = getCorsOrigins();

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ["GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"],
    credentials: true,
  },
  // Allow both polling and websocket transports for better compatibility
  transports: ["polling", "websocket"],
  // Increase timeout for Render deployments
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.use(
  cors({
    origin: corsOrigins,
    methods: ["GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);
// TODO: add a health check endpoint for the server

app.all("/api/auth{/*path}", toNodeHandler(auth));

app.use(express.json());

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

// Mount API routes
app.use(appRouter);
app.use("/api", evalRouter);

app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// Health check endpoint for Render
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    socketConnections: io.sockets.sockets.size,
  });
});

// API endpoint to get recent transcript sessions
app.get("/api/transcripts", async (_req, res) => {
  try {
    const sessions = await transcriptService.getRecentSessions(20);
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching transcripts:", error);
    res.status(500).json({ error: "Failed to fetch transcripts" });
  }
});

// API endpoint to get a specific transcript session
app.get("/api/transcripts/:sessionId", async (req, res) => {
  try {
    const session = await transcriptService.getSessionById(
      req.params.sessionId
    );
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(session);
  } catch (error) {
    console.error("Error fetching transcript:", error);
    res.status(500).json({ error: "Failed to fetch transcript" });
  }
});

// API endpoint to get active sessions
app.get("/api/active-sessions", async (_req, res) => {
  try {
    const sessions = await transcriptService.getActiveSessions();
    res.json(sessions);
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    res.status(500).json({ error: "Failed to fetch active sessions" });
  }
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(`Socket.IO server is ready for live transcription`);
});

// Group multiple sockets into a single logical session by clientId (fallback to socket.id)
type GroupEntry = {
  sessionId: string;
  canonicalSocketId: string; // DB row is keyed by this socketId
  sockets: Set<string>;
  timer?: NodeJS.Timeout;
  isAnalyzing?: boolean;
};
const clientGroups = new Map<string, GroupEntry>();
const socketToGroupKey = new Map<string, string>();

io.on("connection", (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // Create a dedicated speech service instance for this socket
  const speechService = new SpeechService();
  let speechStream: any = null;
  let accumulatedTranscript = ""; // Track full transcript for this session

  const startAgentLoop = async (groupKey: string, sessionId: string) => {
    const runAgentAnalysis = async () => {
      try {
        const current = clientGroups.get(groupKey);
        // Exit if group was deleted (call ended) or already analyzing
        if (!current) {
          console.log(`[Agent] Group ${groupKey} no longer exists, stopping agent`);
          return;
        }
        if (current.isAnalyzing) return;
        
        // Additional safety: check if there are active sockets in the group
        if (current.sockets.size === 0) {
          console.log(`[Agent] No active sockets in group ${groupKey}, stopping agent`);
          return;
        }
        
        current.isAnalyzing = true;
        clientGroups.set(groupKey, current);
        console.log(`[Agent] Starting analysis for session ${sessionId}`);

        const startTime = Date.now();
        const baseUrl =
          process.env.NODE_ENV === "production"
            ? `https://${
                process.env.RENDER_EXTERNAL_HOSTNAME ||
                "project-lovable-server3.onrender.com"
              }`
            : `http://localhost:${port}`;
        
        // Call Claude API and wait for response
        await fetch(`${baseUrl}/api/analyze/${sessionId}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {});

        const elapsedTime = Date.now() - startTime;
        const minInterval = 20_000; // 20 seconds minimum
        const nextCallDelay = Math.max(minInterval - elapsedTime, 0);
        
        console.log(`[Agent] Analysis completed in ${elapsedTime}ms, next call in ${nextCallDelay}ms`);
        
        // Schedule next analysis with minimum 20s interval - only if group still exists
        const current2 = clientGroups.get(groupKey);
        if (current2 && current2.timer && current2.sockets.size > 0) {
          current2.timer = setTimeout(() => runAgentAnalysis(), nextCallDelay);
          clientGroups.set(groupKey, current2);
        } else {
          console.log(`[Agent] Group ${groupKey} ended during analysis, stopping agent`);
        }
      } catch (error) {
        console.error(`[Agent] Error in analysis:`, error);
        // Schedule retry after minimum interval - only if group still exists
        const current = clientGroups.get(groupKey);
        if (current && current.timer && current.sockets.size > 0) {
          current.timer = setTimeout(() => runAgentAnalysis(), 20_000);
          clientGroups.set(groupKey, current);
        }
      } finally {
        const current = clientGroups.get(groupKey);
        if (current) {
          current.isAnalyzing = false;
          clientGroups.set(groupKey, current);
        }
      }
    };

    const entry = clientGroups.get(groupKey);
    if (!entry) return;
    if (entry.timer) clearTimeout(entry.timer);
    
    console.log(`[Agent] Starting agent loop for session ${sessionId}, group ${groupKey}`);
    // Start the loop with initial call
    entry.timer = setTimeout(() => runAgentAnalysis(), 0);
    clientGroups.set(groupKey, entry);
  };

  const stopAgentTimer = (groupKey: string) => {
    const entry = clientGroups.get(groupKey);
    if (!entry?.timer) return;
    console.log(`[Agent] Stopping agent for group ${groupKey}`);
    clearTimeout(entry.timer);
    entry.timer = undefined;
    clientGroups.set(groupKey, entry);
  };

  const endGroupIfLast = async (socketId: string) => {
    const groupKey = socketToGroupKey.get(socketId) || socketId; // legacy fallback
    const entry = clientGroups.get(groupKey);
    if (!entry) {
      // Legacy: no group was created (shouldn't happen if start was called), perform cleanup by socket
      try {
        await transcriptService.cleanupSession(socketId);
      } catch {}
      return;
    }

    entry.sockets.delete(socketId);
    socketToGroupKey.delete(socketId);

    if (entry.sockets.size === 0) {
      stopAgentTimer(groupKey);
      try {
        await transcriptService.endSession(entry.canonicalSocketId);
      } catch (dbError) {
        console.error("Failed to end session in database:", dbError);
      }
      clientGroups.delete(groupKey);
    } else {
      clientGroups.set(groupKey, entry);
    }
  };

  // Handle starting speech recognition
  socket.on("start-transcription", async (options = {}) => {
    console.log(`Starting transcription for client ${socket.id}`, options);

    try {
      // Reset accumulated transcript for new stream on this socket
      accumulatedTranscript = "";

      const clientId = (options as any).clientId as string | undefined;
      const groupKey = clientId || socket.id;

      let group = clientGroups.get(groupKey);
      let sessionId: string;
      let dbOwnerSocketId: string;

      if (!group) {
        // Create database session for the first socket in the group
        const dbSession = await transcriptService.createSession(
          socket.id,
          (options as any).languageCode || "en-US"
        );
        group = {
          sessionId: dbSession.id,
          canonicalSocketId: socket.id,
          sockets: new Set([socket.id]),
        };
        clientGroups.set(groupKey, group);
        socketToGroupKey.set(socket.id, groupKey);
        // Start dynamic agent polling while call is active
        startAgentLoop(groupKey, dbSession.id);
      } else {
        // Reuse existing group session
        group.sockets.add(socket.id);
        clientGroups.set(groupKey, group);
        socketToGroupKey.set(socket.id, groupKey);
      }

      sessionId = group.sessionId;
      dbOwnerSocketId = group.canonicalSocketId;

      speechStream = speechService.createStreamingRecognition({
        onResult: async (transcript, isFinal) => {
          // Send real-time result to client
          socket.emit("transcription-result", {
            transcript,
            isFinal,
            timestamp: new Date().toISOString(),
            sessionId,
          });

          // Determine if this is system audio output or microphone input
          const sourceType = (options as any).sourceType || "input";
          const isSystemAudio = sourceType === "output";

          // Update full transcript and store in database
          if (isFinal) {
            accumulatedTranscript +=
              (accumulatedTranscript ? "\n\n" : "") + transcript.trim();

            try {
              if (isSystemAudio) {
                await transcriptService.appendToTranscriptOutput(
                  dbOwnerSocketId,
                  transcript
                );
              } else {
                await transcriptService.appendToTranscriptInput(
                  dbOwnerSocketId,
                  transcript
                );
              }
            } catch (dbError) {
              console.error(
                `Failed to store final transcript in database (${sourceType}):`,
                dbError
              );
            }
          } else {
            const currentFullTranscript =
              accumulatedTranscript +
              (accumulatedTranscript ? "\n\n" : "") +
              transcript.trim();

            try {
              if (isSystemAudio) {
                await transcriptService.updateLiveTranscriptOutput(
                  dbOwnerSocketId,
                  currentFullTranscript
                );
              } else {
                await transcriptService.updateLiveTranscriptInput(
                  dbOwnerSocketId,
                  currentFullTranscript
                );
              }
            } catch (dbError) {
              console.error(
                `Failed to store interim transcript in database (${sourceType}):`,
                dbError
              );
            }
          }
        },
        onError: async (error) => {
          console.error("Speech recognition error:", error);

          // Only mark session error if this is the canonical socket
          const groupKey = socketToGroupKey.get(socket.id) || socket.id;
          const entry = clientGroups.get(groupKey);
          if (entry && entry.canonicalSocketId === socket.id) {
            await transcriptService.markSessionError(entry.canonicalSocketId);
          }

          socket.emit("transcription-error", {
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
          });
        },
        onEnd: async () => {
          console.log("Speech recognition ended");
          // Do not end the DB session here; it ends when the last socket stops/disconnects
          speechStream = null;
        },
        languageCode: (options as any).languageCode || "en-US",
        sampleRateHertz: (options as any).sampleRateHertz || 16000,
      });

      socket.emit("transcription-started", { sessionId });
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to start speech recognition";
      socket.emit("transcription-error", {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Handle audio data chunks
  socket.on("audio-data", (audioData) => {
    if (speechStream) {
      try {
        const audioBuffer = Buffer.from(audioData, "base64");
        speechService.writeAudioData(audioBuffer);
      } catch (error) {
        console.error("Error processing audio data:", error);
        socket.emit("transcription-error", {
          error: "Error processing audio data",
          timestamp: new Date().toISOString(),
        });
      }
    }
  });

  // Handle transcript output updates (for text being spoken/displayed to user)
  socket.on(
    "transcript-output",
    async (data: { text: string; isFinal?: boolean }) => {
      console.log(
        `Received transcript output from client ${socket.id}:`,
        data.text
      );

      // Route DB writes to the group owner socket
      const groupKey = socketToGroupKey.get(socket.id) || socket.id;
      const entry = clientGroups.get(groupKey);
      const dbOwnerSocketId = entry?.canonicalSocketId || socket.id;

      try {
        if (data.isFinal) {
          await transcriptService.appendToTranscriptOutput(
            dbOwnerSocketId,
            data.text
          );
        } else {
          await transcriptService.updateLiveTranscriptOutput(
            dbOwnerSocketId,
            data.text
          );
        }

        socket.broadcast.emit("transcript-output-update", {
          socketId: dbOwnerSocketId,
          text: data.text,
          isFinal: data.isFinal || false,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error handling transcript output:", error);
        socket.emit("transcript-output-error", {
          error:
            error instanceof Error
              ? error.message
              : "Failed to process transcript output",
          timestamp: new Date().toISOString(),
        });
      }
    }
  );

  // Handle clearing transcript output
  socket.on("clear-transcript-output", async () => {
    console.log(`Clearing transcript output for client ${socket.id}`);

    const groupKey = socketToGroupKey.get(socket.id) || socket.id;
    const entry = clientGroups.get(groupKey);
    const dbOwnerSocketId = entry?.canonicalSocketId || socket.id;

    try {
      await transcriptService.updateLiveTranscriptOutput(dbOwnerSocketId, "");
      socket.emit("transcript-output-cleared", {
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error clearing transcript output:", error);
      socket.emit("transcript-output-error", {
        error:
          error instanceof Error
            ? error.message
            : "Failed to clear transcript output",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Handle stopping transcription
  socket.on("stop-transcription", async () => {
    console.log(`Stopping transcription for client ${socket.id}`);

    if (speechStream) {
      speechService.endStream();
      speechStream = null;
    }

    await endGroupIfLast(socket.id);

    // Reset accumulated transcript for this socket
    accumulatedTranscript = "";

    socket.emit("transcription-stopped", {
      timestamp: new Date().toISOString(),
    });
  });

  // Handle client disconnect
  socket.on("disconnect", async () => {
    console.log(`Client disconnected: ${socket.id}`);

    if (speechStream) {
      speechService.endStream();
      speechStream = null;
    }

    await endGroupIfLast(socket.id);

    // Reset accumulated transcript for this socket
    accumulatedTranscript = "";
  });
});
