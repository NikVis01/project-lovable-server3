import Anthropic from "@anthropic-ai/sdk";
import { ElevenLabsClient, play } from "@elevenlabs/elevenlabs-js";

export type SalesCallMockRequest = {
  systemXmlPrompt: string;
  /** Latest message from the sales rep (the user). Optional if you pass full history. */
  salesRepUtterance?: string;
  /** Optional prior turns for additional context */
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  /** Claude model to use */
  model?: string;
  /** Voice to synthesize with ElevenLabs */
  voiceId?: string;
  /** ElevenLabs model id */
  ttsModelId?: string;
  /** Max tokens for Claude */
  maxTokens?: number;
};

export type SalesCallMockResponse = {
  clientText: string;
  /** Raw audio buffer (e.g., MP3) from ElevenLabs */
  audio: ReadableStream;
  /** MIME type for the audio (e.g., audio/mpeg) */
};

/**
 * Service to generate a client persona reply with Claude and synthesize it via ElevenLabs.
 *
 * Reads API keys from env:
 * - ANTHROPIC_KEY or ANTHROPIC_API_KEY
 * - ELEVEN_KEY or ELEVENLABS_API_KEY
 */
export class SalesCallMockService {
  private anthropic: Anthropic;
  private eleven: ElevenLabsClient;

  constructor() {
    const anthropicKey =
      process.env.ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
    const elevenKey = process.env.ELEVEN_KEY || process.env.ELEVENLABS_API_KEY;

    if (!anthropicKey) {
      throw new Error(
        "Missing ANTHROPIC_KEY (or ANTHROPIC_API_KEY) in environment variables"
      );
    }
    if (!elevenKey) {
      throw new Error(
        "Missing ELEVEN_KEY (or ELEVENLABS_API_KEY) in environment variables"
      );
    }

    this.anthropic = new Anthropic({ apiKey: anthropicKey });
    this.eleven = new ElevenLabsClient({ apiKey: elevenKey });
  }

  /**
   * Creates a single-turn client reply and synthesizes audio for it.
   * The AI assumes the role of the client from a completed sales call, based on the XML system prompt.
   */
  async createClientReply(
    req: SalesCallMockRequest
  ): Promise<SalesCallMockResponse> {
    const {
      systemXmlPrompt,
      salesRepUtterance,
      history = [],
      model = "claude-3-5-sonnet-latest",
      voiceId = process.env.ELEVEN_VOICE_ID || "21m00Tcm4TlvDq8ikWAM", // Rachel (common default)
      ttsModelId = process.env.ELEVEN_TTS_MODEL_ID || "eleven_multilingual_v2",
      maxTokens = 400,
    } = req;

    // Build Claude messages. We treat the assistant as the "client" persona.
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (history.length > 0) {
      messages.push(...history);
    }
    if (salesRepUtterance) {
      messages.push({ role: "user", content: salesRepUtterance });
    }

    // Guard: ensure at least something to respond to
    if (messages.length === 0) {
      messages.push({
        role: "user",
        content:
          "You are the client from a sales call. Please give a brief reaction and key follow-up questions you would ask the sales rep, based on the training prompt.",
      });
    }

    // Call Claude
    const completion = await this.anthropic.messages.create({
      model,
      system: systemXmlPrompt,
      max_tokens: maxTokens,
      messages,
      stream: false,
    });

    const clientText = extractFirstText(completion);

    // Synthesize with ElevenLabs
    const audio  = await this.eleven.textToSpeech.convert(voiceId, {
      text: clientText,
      modelId: ttsModelId,
      outputFormat: 'mp3_44100_128',
    });

    return { clientText, audio };
  }

  private async textToSpeech({
    text,
    voiceId,
    modelId,
  }: {
    text: string;
    voiceId: string;
    modelId: string;
  }): Promise<{ audioBuffer: Buffer; audioContentType: string }> {
    const stream = await this.eleven.textToSpeech.convert(voiceId, {
      modelId: modelId,
      text,
      optimizeStreamingLatency: 3,
      outputFormat: "mp3_44100_128",
      // voiceSettings: { stability: 0.5, similarityBoost: 0.8 },
    });

    // The SDK returns a web/Node stream. Collect to Buffer.
    const chunks: Buffer[] = [];
    // for await supports both Node and Web streams in Bun/Node
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const chunk of stream as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const audioBuffer = Buffer.concat(chunks);
    const audioContentType = "audio/mpeg";
    return { audioBuffer, audioContentType };
  }
}

function extractFirstText(completion: unknown): string {
  // Attempt to access Message.content if present
  const message = completion as { content?: Array<{ type?: string; text?: string }> };
  const parts = message?.content || [];
  for (const part of parts) {
    if ((part as any).type === "text" && typeof (part as any).text === "string") {
      return (part as any).text.trim();
    }
  }
  // Fallback: stringify
  try {
    return JSON.stringify(completion);
  } catch {
    return "";
  }
}

// Intentionally do not instantiate at module load time.
// Create the instance after environment variables are loaded by the server.


