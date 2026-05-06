import axios from "axios";
import { detectIntent, extractCity, getWeather } from "./tools.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Default to the latest fast/cheap Haiku model. Override via ANTHROPIC_MODEL
// (e.g. "claude-sonnet-4-5") to swap in a stronger model without code changes.
const DEFAULT_MODEL = "claude-haiku-4-5";
const MODEL = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

const MAX_TOKENS = 300;

const SYSTEM_PROMPT =
  "You are a helpful, concise assistant. Answer clearly in 1-3 short paragraphs. " +
  "If a user asks about the weather and you don't have a tool result, " +
  "ask them which city they mean.";

const FALLBACK_REPLY =
  "Sorry, I'm having trouble reaching the AI service right now. Please try again in a moment.";

function getApiKey() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return apiKey;
}

async function askLLM(message) {
  const apiKey = getApiKey();

  const response = await axios.post(
    ANTHROPIC_URL,
    {
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Anthropic exposes `system` as a top-level field (not a chat message),
      // so we keep the existing system prompt while honoring the required
      // messages shape: [{ role: "user", content: message }].
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: message }],
    },
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  const reply = response?.data?.content?.[0]?.text;
  return (reply || "").trim() || "Sorry, I couldn't generate a response.";
}

/**
 * Top-level handler: routes the message either to the weather tool or
 * to the LLM, and always returns a string reply.
 */
export async function handleMessage(message) {
  const intent = detectIntent(message);
  console.log(`[llm] intent="${intent}" message="${message}"`);

  if (intent === "weather") {
    const city = extractCity(message);
    return getWeather(city);
  }

  try {
    return await askLLM(message);
  } catch (err) {
    const detail = err?.response?.data ?? err?.message ?? err;
    console.error("[llm] Anthropic error:", detail);
    return FALLBACK_REPLY;
  }
}
