import { handleMessage } from "../server/llm.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body ?? {};
  const { message } = typeof body === "object" ? body : {};

  if (typeof message !== "string" || message.trim().length === 0) {
    return res
      .status(400)
      .json({ error: "Field 'message' must be a non-empty string." });
  }

  const trimmed = message.trim();
  console.log(`[api/chat] received message (${trimmed.length} chars)`);

  try {
    const reply = await handleMessage(trimmed);
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("[api/chat] error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
