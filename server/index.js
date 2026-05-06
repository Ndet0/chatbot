import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleMessage } from "./llm.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.resolve(__dirname, "..", "client");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`[req] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

app.use(express.static(CLIENT_DIR));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/chat", async (req, res) => {
  const { message } = req.body || {};

  if (typeof message !== "string" || message.trim().length === 0) {
    return res.status(400).json({ error: "Field 'message' must be a non-empty string." });
  }

  try {
    const reply = await handleMessage(message.trim());
    return res.json({ reply });
  } catch (err) {
    console.error("[/chat] unhandled error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

app.use((err, _req, res, _next) => {
  console.error("[express] error:", err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`AI chatbot server listening on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "[warn] ANTHROPIC_API_KEY is not set. Non-weather messages will fail until you add it to .env."
    );
  }
});
