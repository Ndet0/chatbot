# AI Chatbot MVP

A minimal, production-quality starter for an AI-powered chatbot web app. It
combines an Anthropic Claude LLM for general conversation with a small "tool"
system that calls the free [Open-Meteo](https://open-meteo.com/) API when the
user asks about the weather.

## Features

- Chat endpoint backed by the Anthropic Messages API (`claude-haiku-4-5`).
- Simple intent router that detects weather questions and answers them via
  Open-Meteo geocoding + current-conditions APIs (no API key needed).
- Vanilla HTML/JS frontend served directly by the Express backend, with a
  clean dark UI and a typing indicator.
- Modular file layout (`server/index.js`, `server/llm.js`, `server/tools.js`)
  designed to be easy to extend with more tools.
- Configuration via `.env` and `dotenv`. CORS enabled. Lightweight request
  logging for debugging.

## Tech Stack

- **Backend:** Node.js, Express, `axios` (raw Anthropic Messages API), dotenv
- **Frontend:** Vanilla JavaScript and HTML (no build step)
- **External APIs:** Anthropic, Open-Meteo (geocoding + forecast)

## Project Structure

```
.
├── server/
│   ├── index.js   # Express app, POST /chat, static client, logging
│   ├── llm.js     # Anthropic client + intent-based routing
│   └── tools.js   # Weather tool (Open-Meteo) + intent / city helpers
├── client/
│   ├── index.html # Chat UI
│   └── app.js     # Frontend logic (fetch + render)
├── package.json
├── .env.example
└── README.md
```

## Setup

Requirements: Node.js 18+ and an Anthropic API key.

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# then edit .env and set:
#   ANTHROPIC_API_KEY=sk-ant-...
#   ANTHROPIC_MODEL=claude-haiku-4-5   # optional
#   PORT=3000                          # optional, defaults to 3000
```

## Run Locally

```bash
npm start
# or, with auto-reload during development:
npm run dev
```

Then open <http://localhost:3000> in your browser. The frontend is served
by the same Express app, so no separate dev server is needed.

You can also call the API directly:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the weather in Paris?"}'
```

Try messages like:

- `What's the weather in Tokyo?`
- `Forecast for New York`
- `Explain recursion in one paragraph.`

## How It Works

1. The browser sends `POST /chat { message }` to the Express server.
2. `server/llm.js` runs a lightweight intent detector from `server/tools.js`.
3. If the message looks like a weather question, the server extracts a city
   and calls Open-Meteo's geocoding + forecast APIs, then returns a
   human-readable summary.
4. Otherwise, the message is forwarded to Anthropic's `claude-haiku-4-5` and
   the response is returned to the client.

## Security Notes

- **Never commit `.env`.** It is listed in `.gitignore`; verify with `git status` before every push.
- **Use environment variables for all secrets.** The server reads `ANTHROPIC_API_KEY` via `process.env` only (`server/llm.js`); no key is ever hardcoded or shipped to the browser.
- **Frontend never sees the key.** All Anthropic calls go through `POST /chat` on the backend.
- **Rotate immediately if exposed.** If a key leaks (logs, screenshots, accidental commit, chat with an AI assistant), revoke it at <https://console.anthropic.com/settings/keys> and issue a new one before pushing.
- **Pre-push checklist:** `git ls-files | grep -E '^\.env(\..+)?$'` should return nothing.

## Future Improvements

- **Real Anthropic tool use.** Replace the keyword-based router with the
  Messages API's `tools` field so the LLM decides when to call the weather
  tool (and which arguments to pass).
- **More tools.** Web search, calculator, news, stock quotes, calendar, etc.
- **Conversation memory.** Persist the message history per session and
  include it in each LLM call.
- **Streaming responses.** Stream tokens to the UI for a more responsive
  feel.
- **Richer UI.** Markdown rendering, code highlighting, mobile polish, light
  theme toggle, multi-conversation sidebar.
- **Auth & rate limiting.** API keys or sessions, plus per-IP/user rate
  limits to protect the Anthropic quota.
- **Deployment.** Single-container Dockerfile and one-click deploys to
  Render, Fly.io, Railway, or Vercel (serverless functions for `/chat`).
- **Tests.** Unit tests for `detectIntent`, `extractCity`, and `getWeather`
  using mocked HTTP.
