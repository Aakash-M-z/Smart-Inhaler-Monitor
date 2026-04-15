/**
 * Entry point for the Smart Inhaler Monitor API server.
 * Loads environment variables from .env and starts Express on port 5000.
 *
 * This system simulates Edge AI locally using rule-based inference.
 * In real-world deployment, this would be replaced by a TensorFlow Lite model
 * running on the inhaler device (ESP32 or similar microcontroller).
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ── Load .env from workspace root ─────────────────────────────────────────────
// Try multiple candidate paths to handle both `tsx src/index.ts` (dev)
// and `node dist/index.mjs` (prod) working directories.
const envCandidates = [
  resolve(process.cwd(), ".env"),                          // workspace root (most common)
  resolve(process.cwd(), "../../.env"),                    // if cwd is artifacts/api-server
  resolve(process.cwd(), "../../../.env"),                 // deeper nesting
];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
        if (key && !(key in process.env)) {
          process.env[key] = value;
        }
      }
    } catch {
      // ignore read errors
    }
    break; // stop at first found .env
  }
}

import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] ?? "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error starting server");
    process.exit(1);
  }
  const hasGroqKey = !!(process.env.GROQ_API_KEY || process.env.GROQ_APIKEY);
  logger.info(
    { port, groqConfigured: hasGroqKey },
    `Smart Inhaler Monitor API server listening on port ${port}`,
  );
});
