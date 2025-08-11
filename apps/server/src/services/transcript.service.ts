import prisma from "../../prisma/index.js";

export class TranscriptService {
  /**
   * Create a new transcript session
   */
  async createSession(socketId: string, languageCode: string = "en-US") {
    try {
      const session = await prisma.transcriptSession.create({
        data: {
          socketId,
          languageCode,
          status: "ACTIVE",
        },
      });

      console.log(
        `Created transcript session: ${session.id} for socket: ${socketId}`
      );
      return session;
    } catch (error) {
      console.error("Error creating transcript session:", error);
      throw new Error("Failed to create transcript session");
    }
  }

  /**
   * Update transcript input content for a session
   */
  async updateTranscriptInput(socketId: string, transcriptInput: string) {
    try {
      const session = await prisma.transcriptSession.update({
        where: { socketId },
        data: { transcriptInput },
      });

      return session;
    } catch (error) {
      console.error("Error updating transcript input:", error);
      throw new Error("Failed to update transcript input");
    }
  }

  /**
   * Update transcript output content for a session
   */
  async updateTranscriptOutput(socketId: string, transcriptOutput: string) {
    try {
      const session = await prisma.transcriptSession.update({
        where: { socketId },
        data: { transcriptOutput },
      });

      return session;
    } catch (error) {
      console.error("Error updating transcript output:", error);
      throw new Error("Failed to update transcript output");
    }
  }

  /**
   * Append text to existing transcript input
   */
  async appendToTranscriptInput(socketId: string, newText: string) {
    try {
      const existingSession = await prisma.transcriptSession.findUnique({
        where: { socketId },
      });

      if (!existingSession) {
        throw new Error("Session not found");
      }

      const updatedTranscript = existingSession.transcriptInput
        ? `${existingSession.transcriptInput}\n\n${newText.trim()}`
        : newText.trim();

      const session = await prisma.transcriptSession.update({
        where: { socketId },
        data: { transcriptInput: updatedTranscript },
      });

      return session;
    } catch (error) {
      console.error("Error appending to transcript input:", error);
      throw new Error("Failed to append to transcript input");
    }
  }

  /**
   * Append text to existing transcript output
   */
  async appendToTranscriptOutput(socketId: string, newText: string) {
    try {
      const existingSession = await prisma.transcriptSession.findUnique({
        where: { socketId },
      });

      if (!existingSession) {
        throw new Error("Session not found");
      }

      const updatedTranscript = existingSession.transcriptOutput
        ? `${existingSession.transcriptOutput}\n\n${newText.trim()}`
        : newText.trim();

      const session = await prisma.transcriptSession.update({
        where: { socketId },
        data: { transcriptOutput: updatedTranscript },
      });

      return session;
    } catch (error) {
      console.error("Error appending to transcript output:", error);
      throw new Error("Failed to append to transcript output");
    }
  }

  /**
   * Update transcript input with live content (overwrite current transcript input)
   * This is used for interim results that keep changing
   */
  async updateLiveTranscriptInput(socketId: string, fullTranscript: string) {
    try {
      const session = await prisma.transcriptSession.update({
        where: { socketId },
        data: { transcriptInput: fullTranscript.trim() },
      });

      return session;
    } catch (error) {
      console.error("Error updating live transcript input:", error);
      throw new Error("Failed to update live transcript input");
    }
  }

  /**
   * Update transcript output with live content (overwrite current transcript output)
   * This is used for live output being spoken/displayed
   */
  async updateLiveTranscriptOutput(socketId: string, fullTranscript: string) {
    try {
      const session = await prisma.transcriptSession.update({
        where: { socketId },
        data: { transcriptOutput: fullTranscript.trim() },
      });

      return session;
    } catch (error) {
      console.error("Error updating live transcript output:", error);
      throw new Error("Failed to update live transcript output");
    }
  }

  /**
   * End a transcript session
   */
  async endSession(socketId: string) {
    try {
      const session = await prisma.transcriptSession.update({
        where: { socketId },
        data: {
          status: "ENDED",
          endedAt: new Date(),
        },
      });

      console.log(
        `Ended transcript session: ${session.id} for socket: ${socketId}`
      );
      return session;
    } catch (error) {
      console.error("Error ending transcript session:", error);
      throw new Error("Failed to end transcript session");
    }
  }

  /**
   * Mark session as error state
   */
  async markSessionError(socketId: string) {
    try {
      const session = await prisma.transcriptSession.update({
        where: { socketId },
        data: {
          status: "ERROR",
          endedAt: new Date(),
        },
      });

      console.log(
        `Marked transcript session as error: ${session.id} for socket: ${socketId}`
      );
      return session;
    } catch (error) {
      console.error("Error marking session as error:", error);
      // Don't throw here as this is a cleanup operation
    }
  }

  /**
   * Get session by socket ID
   */
  async getSession(socketId: string) {
    try {
      const session = await prisma.transcriptSession.findUnique({
        where: { socketId },
      });

      return session;
    } catch (error) {
      console.error("Error getting session:", error);
      throw new Error("Failed to get session");
    }
  }

  /**
   * Get session by session ID
   */
  async getSessionById(sessionId: string) {
    try {
      const session = await prisma.transcriptSession.findUnique({
        where: { id: sessionId },
      });

      return session;
    } catch (error) {
      console.error("Error getting session by ID:", error);
      throw new Error("Failed to get session");
    }
  }

  /**
   * Get all active sessions
   */
  async getActiveSessions() {
    try {
      const sessions = await prisma.transcriptSession.findMany({
        where: { status: "ACTIVE" },
        orderBy: { startedAt: "desc" },
      });

      return sessions;
    } catch (error) {
      console.error("Error getting active sessions:", error);
      throw new Error("Failed to get active sessions");
    }
  }

  /**
   * Clean up session on disconnect (mark as ended if still active)
   */
  async cleanupSession(socketId: string) {
    try {
      const existingSession = await prisma.transcriptSession.findUnique({
        where: { socketId },
      });

      if (existingSession && existingSession.status === "ACTIVE") {
        await this.endSession(socketId);
      }
    } catch (error) {
      console.error("Error cleaning up session:", error);
      // Don't throw here as this is a cleanup operation
    }
  }

  /**
   * Get recent sessions for debugging/monitoring
   */
  async getRecentSessions(limit: number = 10) {
    try {
      const sessions = await prisma.transcriptSession.findMany({
        orderBy: { startedAt: "desc" },
        take: limit,
      });

      return sessions;
    } catch (error) {
      console.error("Error getting recent sessions:", error);
      throw new Error("Failed to get recent sessions");
    }
  }

  /**
   * Get sessions with recordings (that have audio URLs)
   */
  async getSessionsWithRecordings(limit: number = 50, offset: number = 0) {
    try {
      const sessions = await prisma.transcriptSession.findMany({
        where: {
          OR: [
            { audioInputUrl: { not: null } },
            { audioOutputUrl: { not: null } },
          ],
        },
        orderBy: { startedAt: "desc" },
        take: limit,
        skip: offset,
      });

      return sessions;
    } catch (error) {
      console.error("Error getting sessions with recordings:", error);
      throw new Error("Failed to get sessions with recordings");
    }
  }

  /**
   * Get all sessions (with pagination)
   */
  async getAllSessions(limit: number = 50, offset: number = 0) {
    try {
      const sessions = await prisma.transcriptSession.findMany({
        orderBy: { startedAt: "desc" },
        take: limit,
        skip: offset,
      });

      return sessions;
    } catch (error) {
      console.error("Error getting all sessions:", error);
      throw new Error("Failed to get all sessions");
    }
  }

  /**
   * Delete a session by ID
   */
  async deleteSession(sessionId: string) {
    try {
      const session = await prisma.transcriptSession.delete({
        where: { id: sessionId },
      });

      console.log(`Deleted session: ${session.id}`);
      return session;
    } catch (error) {
      console.error("Error deleting session:", error);
      throw new Error("Failed to delete session");
    }
  }

  /**
   * Update audio input URL for a session
   */
  async updateAudioInputUrl(socketId: string, audioUrl: string) {
    try {
      const session = await prisma.transcriptSession.update({
        where: { socketId },
        data: { audioInputUrl: audioUrl },
      });

      console.log(
        `Updated audio input URL for session ${session.id}: ${audioUrl}`
      );
      return session;
    } catch (error) {
      console.error("Error updating audio input URL:", error);
      throw new Error("Failed to update audio input URL");
    }
  }

  /**
   * Update audio output URL for a session
   */
  async updateAudioOutputUrl(socketId: string, audioUrl: string) {
    try {
      const session = await prisma.transcriptSession.update({
        where: { socketId },
        data: { audioOutputUrl: audioUrl },
      });

      console.log(
        `Updated audio output URL for session ${session.id}: ${audioUrl}`
      );
      return session;
    } catch (error) {
      console.error("Error updating audio output URL:", error);
      throw new Error("Failed to update audio output URL");
    }
  }

  /**
   * Update both audio URLs for a session
   */
  async updateAudioUrls(
    socketId: string,
    inputUrl?: string,
    outputUrl?: string
  ) {
    try {
      const updateData: any = {};
      if (inputUrl) updateData.audioInputUrl = inputUrl;
      if (outputUrl) updateData.audioOutputUrl = outputUrl;

      const session = await prisma.transcriptSession.update({
        where: { socketId },
        data: updateData,
      });

      console.log(`Updated audio URLs for session ${session.id}`, {
        inputUrl,
        outputUrl,
      });
      return session;
    } catch (error) {
      console.error("Error updating audio URLs:", error);
      throw new Error("Failed to update audio URLs");
    }
  }
}

export const transcriptService = new TranscriptService();
