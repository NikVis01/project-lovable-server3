import "dotenv/config";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { SpeechService } from "./services/speech.service.js";
import { transcriptService } from "./services/transcript.service.js";
import { appRouter } from "./routers/index.js";
import { agentRouter } from "./routers/agent.router.js";

const app = express();
const server = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    methods: ["GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"],
    credentials: true,
  },
});
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3001",
    methods: ["GET", "POST", "OPTIONS", "DELETE", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json());

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

// Mount API routes
app.use(appRouter);
// Mount agent routes (POST /api/analyze/:sessionId)
app.use("/api", agentRouter);

app.get("/", (_req, res) => {
  res.status(200).send("OK");
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

// Store active transcription sessions
const transcriptionSessions = new Map();

// Store session coordination for multi-socket sessions (input + output)
// This allows two sockets (one for microphone input, one for system audio output)
// to share the same database session, enabling simultaneous transcription
const sessionCoordination = new Map();

// Cleanup stale session coordinations every 5 minutes
const COORDINATION_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const COORDINATION_MAX_AGE = 10 * 60 * 1000; // 10 minutes

setInterval(() => {
  const now = Date.now();
  for (const [clientId, coordination] of sessionCoordination.entries()) {
    if (now - coordination.lastActivity > COORDINATION_MAX_AGE) {
      console.log(
        `Cleaning up stale session coordination for client ${clientId}`
      );
      // Clean up the database session if it exists
      if (coordination.dbSession) {
        transcriptService
          .cleanupSession(coordination.dbSession.socketId)
          .catch(console.error);
      }
      sessionCoordination.delete(clientId);
    }
  }
}, COORDINATION_CLEANUP_INTERVAL);

io.on("connection", (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // Create a dedicated speech service instance for this socket
  const speechService = new SpeechService();
  let speechStream: any = null;
  let accumulatedInputTranscript = ""; // Track input transcript for this session
  let accumulatedOutputTranscript = ""; // Track output transcript for this session

  // Handle starting speech recognition
  socket.on("start-transcription", async (options = {}) => {
    console.log(`Starting transcription for client ${socket.id}`, options);

    try {
      const sourceType = options.sourceType || "input";

      // Reset accumulated transcript for new session
      if (sourceType === "input") {
        accumulatedInputTranscript = "";
      } else {
        accumulatedOutputTranscript = "";
      }

      // Handle session coordination for multi-socket sessions
      let dbSession;
      const clientId = options.clientId || socket.handshake.address; // Use client ID or IP to group sockets

      if (sessionCoordination.has(clientId)) {
        // Use existing session for this client
        const coordination = sessionCoordination.get(clientId);
        dbSession = coordination.dbSession;
        console.log(
          `Using existing session ${dbSession.id} for ${sourceType} transcription`
        );
      } else {
        // Create new database session
        dbSession = await transcriptService.createSession(
          socket.id,
          options.languageCode || "en-US"
        );

        // Initialize session coordination
        sessionCoordination.set(clientId, {
          dbSession,
          inputSocketId: sourceType === "input" ? socket.id : null,
          outputSocketId: sourceType === "output" ? socket.id : null,
          lastActivity: Date.now(),
        });
        console.log(
          `Created new session ${dbSession.id} for ${sourceType} transcription`
        );
      }

      // Update coordination with this socket
      const coordination = sessionCoordination.get(clientId);
      if (sourceType === "input") {
        coordination.inputSocketId = socket.id;
      } else {
        coordination.outputSocketId = socket.id;
      }
      coordination.lastActivity = Date.now();

      speechStream = speechService.createStreamingRecognition({
        onResult: async (transcript, isFinal) => {
          // Send real-time result to client
          socket.emit("transcription-result", {
            transcript,
            isFinal,
            timestamp: new Date().toISOString(),
            sessionId: dbSession.id,
          });

          // Determine if this is system audio output or microphone input
          const isSystemAudio = sourceType === "output";

          // Update appropriate accumulated transcript
          let currentAccumulated, currentFullTranscript;

          if (isFinal) {
            // Add final transcript to appropriate accumulated transcript
            if (isSystemAudio) {
              accumulatedOutputTranscript +=
                (accumulatedOutputTranscript ? "\n\n" : "") + transcript.trim();
              currentAccumulated = accumulatedOutputTranscript;
            } else {
              accumulatedInputTranscript +=
                (accumulatedInputTranscript ? "\n\n" : "") + transcript.trim();
              currentAccumulated = accumulatedInputTranscript;
            }
            currentFullTranscript = currentAccumulated;
          } else {
            // For interim results, show current accumulated + interim
            if (isSystemAudio) {
              currentFullTranscript =
                accumulatedOutputTranscript +
                (accumulatedOutputTranscript ? "\n\n" : "") +
                transcript.trim();
            } else {
              currentFullTranscript =
                accumulatedInputTranscript +
                (accumulatedInputTranscript ? "\n\n" : "") +
                transcript.trim();
            }
          }

          // Update database using the shared session but the original socket ID for lookups
          try {
            if (isSystemAudio) {
              await transcriptService.updateLiveTranscriptOutput(
                dbSession.socketId,
                currentFullTranscript
              );
            } else {
              await transcriptService.updateLiveTranscriptInput(
                dbSession.socketId,
                currentFullTranscript
              );
            }
          } catch (dbError) {
            console.error(
              `Failed to store ${
                isFinal ? "final" : "interim"
              } transcript in database (${sourceType}):`,
              dbError
            );
          }
        },
        onError: async (error) => {
          console.error("Speech recognition error:", error);

          // Mark session as error in database using the shared session
          await transcriptService.markSessionError(dbSession.socketId);

          socket.emit("transcription-error", {
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        },
        onEnd: async () => {
          console.log(`Speech recognition ended for ${sourceType}`);

          socket.emit("transcription-ended", {
            timestamp: new Date().toISOString(),
          });
          speechStream = null;

          // Note: Don't end the database session here as the other socket might still be active
          // Session cleanup will happen when both sockets disconnect
        },
        languageCode: options.languageCode || "en-US",
        sampleRateHertz: options.sampleRateHertz || 16000,
      });

      transcriptionSessions.set(socket.id, {
        speechStream,
        dbSession,
        sourceType,
        clientId,
      });
      socket.emit("transcription-started", { sessionId: dbSession.id });
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
        // Convert base64 audio data to buffer
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

      try {
        if (data.isFinal) {
          // Append final output to transcript output
          await transcriptService.appendToTranscriptOutput(
            socket.id,
            data.text
          );
        } else {
          // Update live transcript output with interim text
          await transcriptService.updateLiveTranscriptOutput(
            socket.id,
            data.text
          );
        }

        // Broadcast to other clients viewing this session (optional)
        socket.broadcast.emit("transcript-output-update", {
          socketId: socket.id,
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

    try {
      await transcriptService.updateLiveTranscriptOutput(socket.id, "");
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

    const session = transcriptionSessions.get(socket.id);

    if (speechStream) {
      speechService.endStream();
      speechStream = null;
    }

    if (session) {
      const { clientId, sourceType } = session;

      // Reset appropriate accumulated transcript
      if (sourceType === "input") {
        accumulatedInputTranscript = "";
      } else {
        accumulatedOutputTranscript = "";
      }

      // Handle session coordination cleanup
      if (sessionCoordination.has(clientId)) {
        const coordination = sessionCoordination.get(clientId);

        // Remove this socket from coordination
        if (sourceType === "input") {
          coordination.inputSocketId = null;
        } else {
          coordination.outputSocketId = null;
        }

        // If both sockets are gone, end the database session
        if (!coordination.inputSocketId && !coordination.outputSocketId) {
          try {
            await transcriptService.endSession(coordination.dbSession.socketId);
            sessionCoordination.delete(clientId);
            console.log(
              `Ended shared session ${coordination.dbSession.id} - all sockets disconnected`
            );
          } catch (dbError) {
            console.error("Failed to end session in database:", dbError);
          }
        } else {
          console.log(
            `Keeping session ${coordination.dbSession.id} active - other socket still connected`
          );
        }
      }
    }

    transcriptionSessions.delete(socket.id);
    socket.emit("transcription-stopped", {
      timestamp: new Date().toISOString(),
    });
  });

  // Handle client disconnect
  socket.on("disconnect", async () => {
    console.log(`Client disconnected: ${socket.id}`);

    const session = transcriptionSessions.get(socket.id);

    if (speechStream) {
      speechService.endStream();
      speechStream = null;
    }

    if (session) {
      const { clientId, sourceType } = session;

      // Reset appropriate accumulated transcript
      if (sourceType === "input") {
        accumulatedInputTranscript = "";
      } else {
        accumulatedOutputTranscript = "";
      }

      // Handle session coordination cleanup
      if (sessionCoordination.has(clientId)) {
        const coordination = sessionCoordination.get(clientId);

        // Remove this socket from coordination
        if (sourceType === "input") {
          coordination.inputSocketId = null;
        } else {
          coordination.outputSocketId = null;
        }

        // If both sockets are gone, clean up the database session
        if (!coordination.inputSocketId && !coordination.outputSocketId) {
          await transcriptService.cleanupSession(
            coordination.dbSession.socketId
          );
          sessionCoordination.delete(clientId);
          console.log(
            `Cleaned up shared session ${coordination.dbSession.id} - all sockets disconnected`
          );
        } else {
          console.log(
            `Keeping session ${coordination.dbSession.id} active - other socket still connected`
          );
        }
      } else {
        // Fallback for sessions not using coordination
        await transcriptService.cleanupSession(socket.id);
      }
    } else {
      // Fallback cleanup
      await transcriptService.cleanupSession(socket.id);
    }

    transcriptionSessions.delete(socket.id);
  });
});
