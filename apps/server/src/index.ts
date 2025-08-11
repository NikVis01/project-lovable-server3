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
    methods: ["GET", "POST"],
    credentials: true,
  },
});
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "",
    methods: ["GET", "POST", "OPTIONS"],
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

io.on("connection", (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // Create a dedicated speech service instance for this socket
  const speechService = new SpeechService();
  let speechStream: any = null;
  let accumulatedTranscript = ""; // Track full transcript for this session

  // Handle starting speech recognition
  socket.on("start-transcription", async (options = {}) => {
    console.log(`Starting transcription for client ${socket.id}`, options);

    try {
      // Reset accumulated transcript for new session
      accumulatedTranscript = "";

      // Create database session
      const dbSession = await transcriptService.createSession(
        socket.id,
        options.languageCode || "en-US"
      );

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
          const sourceType = options.sourceType || "input"; // Default to input for backward compatibility
          const isSystemAudio = sourceType === "output";

          // Update full transcript and store in database
          if (isFinal) {
            // Add final transcript to accumulated transcript
            accumulatedTranscript +=
              (accumulatedTranscript ? "\n\n" : "") + transcript.trim();

            try {
              if (isSystemAudio) {
                await transcriptService.updateLiveTranscriptOutput(
                  socket.id,
                  accumulatedTranscript
                );
              } else {
                await transcriptService.updateLiveTranscriptInput(
                  socket.id,
                  accumulatedTranscript
                );
              }
            } catch (dbError) {
              console.error(
                `Failed to store final transcript in database (${sourceType}):`,
                dbError
              );
            }
          } else {
            // For interim results, show current accumulated + interim
            const currentFullTranscript =
              accumulatedTranscript +
              (accumulatedTranscript ? "\n\n" : "") +
              transcript.trim();

            try {
              if (isSystemAudio) {
                await transcriptService.updateLiveTranscriptOutput(
                  socket.id,
                  currentFullTranscript
                );
              } else {
                await transcriptService.updateLiveTranscriptInput(
                  socket.id,
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

          // Mark session as error in database
          await transcriptService.markSessionError(socket.id);

          socket.emit("transcription-error", {
            error: error.message,
            timestamp: new Date().toISOString(),
          });
        },
        onEnd: async () => {
          console.log("Speech recognition ended");

          // End database session
          try {
            await transcriptService.endSession(socket.id);
          } catch (dbError) {
            console.error("Failed to end session in database:", dbError);
          }

          socket.emit("transcription-ended", {
            timestamp: new Date().toISOString(),
          });
          speechStream = null;
        },
        languageCode: options.languageCode || "en-US",
        sampleRateHertz: options.sampleRateHertz || 16000,
      });

      transcriptionSessions.set(socket.id, { speechStream, dbSession });
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

    if (speechStream) {
      speechService.endStream();
      speechStream = null;
    }

    // End database session
    try {
      await transcriptService.endSession(socket.id);
    } catch (dbError) {
      console.error("Failed to end session in database:", dbError);
    }

    // Reset accumulated transcript
    accumulatedTranscript = "";

    transcriptionSessions.delete(socket.id);
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

    // Clean up database session
    await transcriptService.cleanupSession(socket.id);

    // Reset accumulated transcript
    accumulatedTranscript = "";

    transcriptionSessions.delete(socket.id);
  });
});
