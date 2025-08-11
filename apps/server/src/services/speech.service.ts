import { SpeechClient } from "@google-cloud/speech";
import { Transform } from "stream";

export class SpeechService {
  private client: SpeechClient;
  private recognizeStream: any = null;

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
        throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_KEY format");
      }
    }

    this.client = new SpeechClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      ...(credentials && { credentials }),
    });
  }

  /**
   * Create a streaming recognition stream
   */
  createStreamingRecognition(options: {
    onResult: (transcript: string, isFinal: boolean) => void;
    onError: (error: Error) => void;
    onEnd: () => void;
    languageCode?: string;
    sampleRateHertz?: number;
  }) {
    const {
      onResult,
      onError,
      onEnd,
      languageCode = "en-US",
      sampleRateHertz = 16000,
    } = options;

    const config: any = {
      encoding: "WEBM_OPUS" as const,
      sampleRateHertz: sampleRateHertz,
      languageCode: languageCode,
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: false,
      model: "latest_long",
      useEnhanced: true,
    };

    const request = {
      config,
      interimResults: true,
    };

    // Create the streaming recognition request
    this.recognizeStream = this.client
      .streamingRecognize(request)
      .on("error", (error) => {
        console.error("Speech recognition error:", error);
        onError(error);
      })
      .on("data", (data) => {
        if (data.results[0] && data.results[0].alternatives[0]) {
          const transcript = data.results[0].alternatives[0].transcript;
          const isFinal = data.results[0].isFinal;
          onResult(transcript, isFinal);
        }
      })
      .on("end", () => {
        console.log("Speech recognition stream ended");
        onEnd();
      });

    return this.recognizeStream;
  }

  /**
   * Write audio data to the recognition stream
   */
  writeAudioData(audioData: Buffer) {
    if (
      this.recognizeStream &&
      !this.recognizeStream.destroyed &&
      this.recognizeStream.writable
    ) {
      try {
        this.recognizeStream.write(audioData);
      } catch (error) {
        console.error("Error writing audio data to stream:", error);
      }
    }
  }

  /**
   * End the recognition stream
   */
  endStream() {
    if (this.recognizeStream && !this.recognizeStream.destroyed) {
      this.recognizeStream.end();
    }
    this.recognizeStream = null;
  }

  /**
   * Create a transform stream that converts audio chunks to the correct format
   */
  createAudioTransform() {
    return new Transform({
      transform(chunk: any, encoding: BufferEncoding, callback: Function) {
        // Pass through the audio data
        // In a real implementation, you might want to convert audio formats here
        callback(null, chunk);
      },
    });
  }

  /**
   * Test the speech service with a simple recognition
   */
  async testRecognition(audioBuffer: Buffer): Promise<string> {
    const request = {
      audio: {
        content: audioBuffer.toString("base64"),
      },
      config: {
        encoding: "WEBM_OPUS" as const,
        sampleRateHertz: 16000,
        languageCode: "en-US",
      },
    };

    try {
      const [response] = await this.client.recognize(request);
      const transcription =
        response.results
          ?.map((result) => result.alternatives?.[0]?.transcript)
          .join("\n") || "";

      return transcription;
    } catch (error) {
      console.error("Speech recognition test failed:", error);
      throw error;
    }
  }
}

// Export class for per-socket instantiation
// export const speechService = new SpeechService();
