import path from "node:path";
import fs from "node:fs";
import dotenv from "dotenv";
import { agentService } from "../agent/index.js";

// Load env: prefer root .env, fallback to server .env
const rootEnvPath = path.resolve(__dirname, "../../../../../.env");
const serverEnvPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(rootEnvPath)) dotenv.config({ path: rootEnvPath });
if (fs.existsSync(serverEnvPath)) dotenv.config({ path: serverEnvPath });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY in .env (root or apps/server)");
  process.exit(1);
}

const sessionId = `test-${Date.now()}`;

const client = [
  "We currently spend too much time manually entering data into our CRM.",
  "Budget is tight this quarter, and our legal team is cautious about compliance.",
  "If we could automate summaries and reduce errors, that would help a lot.",
].join(" \n");

const salesman = [
  "Our platform can streamline your workflow and reduce manual work.",
  "I can walk you through an implementation plan that fits a limited budget.",
  "We avoid making guarantees, but I can show references and compliance docs.",
].join(" \n");

const main = async () => {
  const result = await agentService.processConversation({ sessionId, client, salesman });
  // Pretty-print while keeping nulls
  console.log(JSON.stringify(result, null, 2));
};

main().catch((err) => {
  console.error("Agent smoke test failed:", err);
  process.exit(1);
}); 