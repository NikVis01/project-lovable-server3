import { Router } from "express";
import multer from "multer";
import { StorageService } from "../services/storage.service.js";
import { transcriptService } from "../services/transcript.service.js";

// Configure multer for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Initialize storage service
const storageService = new StorageService();

export const audioRouter: Router = Router();

// API endpoint to upload audio recordings
audioRouter.post(
  "/upload-recording",
  upload.single("audio"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const { sessionId, type } = req.body;

      if (!sessionId || !type) {
        return res.status(400).json({
          error: "Missing required fields: sessionId and type",
        });
      }

      if (type !== "input" && type !== "output") {
        return res.status(400).json({
          error: "Type must be either 'input' or 'output'",
        });
      }

      console.log(`Uploading ${type} recording for session ${sessionId}`);

      let audioUrl: string;

      try {
        // Try to upload to Google Cloud Storage first
        audioUrl = await storageService.uploadAudioFile(
          req.file.buffer,
          sessionId,
          type,
          req.file.mimetype
        );
      } catch (gcsError) {
        console.error(
          "Google Cloud Storage upload failed, using local fallback:",
          gcsError
        );

        // Fallback to local storage
        const fs = await import("fs");
        const path = await import("path");

        const uploadsDir = path.join(
          process.cwd(),
          "uploads",
          "recordings",
          sessionId
        );
        await fs.promises.mkdir(uploadsDir, { recursive: true });

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const fileName = `${type}_${timestamp}.webm`;
        const filePath = path.join(uploadsDir, fileName);

        await fs.promises.writeFile(filePath, req.file.buffer);

        // Return a local URL that can be served statically
        audioUrl = `${
          process.env.SERVER_URL || "http://localhost:3000"
        }/uploads/recordings/${sessionId}/${fileName}`;
        console.log(`Saved recording locally: ${audioUrl}`);
      }

      // Find session by sessionId to get socketId
      const session = await transcriptService.getSessionById(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Update database with audio URL using socketId
      if (type === "input") {
        await transcriptService.updateAudioInputUrl(session.socketId, audioUrl);
      } else {
        await transcriptService.updateAudioOutputUrl(
          session.socketId,
          audioUrl
        );
      }

      res.json({
        success: true,
        url: audioUrl,
        sessionId,
        type,
      });
    } catch (error) {
      console.error("Error uploading recording:", error);
      res.status(500).json({
        error: "Failed to upload recording",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
