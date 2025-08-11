// liveSalesCall.ts
import "dotenv/config";
import record from "node-record-lpcm16";
import Speaker from "speaker";
import { SpeechClient } from "@google-cloud/speech";
import { SalesCallMockService } from "./eleven.ts";
import { ElevenLabsClient, play } from '@elevenlabs/elevenlabs-js';

// --- Google Speech Client Setup ---
const googleKey = JSON.parse(
  Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!, "base64").toString("utf8")
);

const speechClient = new SpeechClient({
  credentials: {
    client_email: googleKey.client_email,
    private_key: googleKey.private_key,
  },
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

// --- Instantiate your Sales Call Service ---
const salesService = new SalesCallMockService();

// Keep chat history so Claude remembers context
let history: Array<{ role: "user" | "assistant"; content: string }> = [];

async function startSalesCall() {
  console.log("🎤 Speak into your mic. Press Ctrl+C to quit.");

  // Google STT streaming request config
  const request = {
    config: {
      encoding: "LINEAR16" as const,
      sampleRateHertz: 16000,
      languageCode: "en-US",
    },
    interimResults: false, // final results only
  };

  // Stream mic → Google → Claude + ElevenLabs → Speaker
  const recognizeStream = speechClient
    .streamingRecognize(request)
    .on("error", (err) => console.error("Google STT Error:", err))
    .on("data", async (data) => {
  console.log('Raw data:', JSON.stringify(data, null, 2)); // <--- Add this line

  const transcript = data.results
    .map((r) => r.alternatives[0].transcript)
    .join("\n")
    .trim();

  if (!transcript) return;

  console.log(`🗣 Sales Rep: ${transcript}`);


      try {
        // Call your existing SalesCallMockService
        const { clientText, audio } = await salesService.createClientReply({
          systemXmlPrompt: `<client persona xml here>`, // your XML prompt here
          salesRepUtterance: transcript,
          history,
        });

        // Update conversation history
        history.push({ role: "user", content: transcript });
        history.push({ role: "assistant", content: clientText });

        console.log(`🤖 Client: ${clientText}`);

        // Play ElevenLabs audio
        const speaker = new Speaker({
          channels: 2,
          bitDepth: 16,
          sampleRate: 44100,
        });
        play(audio)
        speaker.end();
      } catch (err) {
        console.error("SalesCallMockService Error:", err);
      }
    });

  // Start recording from the mic
  const recording = record.record({
  sampleRateHertz: 16000,
  threshold: 0,
  verbose: false,
  recordProgram: process.platform === "darwin" ? "rec" : "arecord",
  silence: "1.0",
});

recording.stream()
  .on("error", console.error)
  .pipe(recognizeStream);
}

startSalesCall();
