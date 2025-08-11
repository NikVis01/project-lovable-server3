import { Storage } from "@google-cloud/storage";

export class StorageService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    let credentials;

    // If service account key is provided as base64 encoded string
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        const decodedKey = Buffer.from(
          process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
          "base64"
        ).toString("utf8");
        credentials = JSON.parse(decodedKey);
      } catch (error) {
        console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:", error);
        console.warn(
          "Google Cloud Storage will use default credentials or fail"
        );
      }
    } else {
      console.warn(
        "No GOOGLE_SERVICE_ACCOUNT_KEY found, using default Google Cloud credentials"
      );
    }

    this.storage = new Storage({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      ...(credentials && { credentials }),
    });

    this.bucketName =
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "transcript-recordings";
  }

  /**
   * Upload audio buffer to Google Cloud Storage
   */
  async uploadAudioFile(
    audioBuffer: Buffer,
    sessionId: string,
    type: "input" | "output",
    mimeType: string = "audio/wav"
  ): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `recordings/${sessionId}/${type}_${timestamp}.wav`;

      // Ensure bucket exists
      await this.ensureBucketExists();

      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      // Upload the audio buffer
      await file.save(audioBuffer, {
        metadata: {
          contentType: mimeType,
          metadata: {
            sessionId,
            type,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      // Make the file publicly accessible (optional - for playback)
      await file.makePublic();

      // Return the public URL
      const publicUrl = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
      console.log(
        `Uploaded ${type} recording for session ${sessionId}: ${publicUrl}`
      );

      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${type} audio file:`, error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        bucketName: this.bucketName,
        fileName,
        hasCredentials: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      });
      throw new Error(
        `Failed to upload ${type} audio file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Convert multiple audio chunks to a single WAV buffer
   */
  convertToWav(audioChunks: Blob[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Simple concatenation for WebM/Opus chunks
        // In a production environment, you might want to use ffmpeg or similar
        // to properly convert to WAV format

        const totalSize = audioChunks.reduce(
          (total, chunk) => total + chunk.size,
          0
        );
        const combinedBuffer = Buffer.alloc(totalSize);

        let offset = 0;
        audioChunks.forEach((chunk) => {
          const arrayBuffer = chunk.arrayBuffer() as any;
          const buffer = Buffer.from(arrayBuffer);
          buffer.copy(combinedBuffer, offset);
          offset += buffer.length;
        });

        resolve(combinedBuffer);
      } catch (error) {
        console.error("Error converting audio chunks to WAV:", error);
        reject(new Error("Failed to convert audio chunks to WAV"));
      }
    });
  }

  /**
   * Delete audio file from Google Cloud Storage
   */
  async deleteAudioFile(fileName: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      await file.delete();
      console.log(`Deleted audio file: ${fileName}`);
    } catch (error) {
      console.error("Error deleting audio file:", error);
      throw new Error("Failed to delete audio file");
    }
  }

  /**
   * Get signed URL for private access to audio file
   */
  async getSignedUrl(
    fileName: string,
    expirationMinutes: number = 60
  ): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + expirationMinutes * 60 * 1000,
      });

      return signedUrl;
    } catch (error) {
      console.error("Error generating signed URL:", error);
      throw new Error("Failed to generate signed URL");
    }
  }

  /**
   * Check if bucket exists and create if not
   */
  async ensureBucketExists(): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [exists] = await bucket.exists();

      if (!exists) {
        await this.storage.createBucket(this.bucketName, {
          location: "US",
          storageClass: "STANDARD",
        });
        console.log(`Created bucket: ${this.bucketName}`);
      }
    } catch (error) {
      console.error("Error ensuring bucket exists:", error);
      throw new Error("Failed to ensure bucket exists");
    }
  }
}
