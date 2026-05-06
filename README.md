# AI Chatbot MVP

A minimal, production-quality starter for an AI-powered chatbot web app. It
combines an Anthropic Claude LLM for general conversation with a small "tool"
system that calls the free [Open-Meteo](https://open-meteo.com/) API when the
user asks about the weather.

## Features

- Chat endpoint backed by the Anthropic Messages API (`claude-haiku-4-5`).
- Simple intent router that detects weather questions and answers them via
  Open-Meteo geocoding + current-conditions APIs (no API key needed).
- Vanilla HTML/JS frontend served as static assets by Vercel, with a clean
  dark UI and a typing indicator.
- Stateless serverless function (`api/chat.js`) that reuses the same LLM and
  weather logic, designed to be easy to extend with more tools.
- Production deployment on Vercel with a single `vercel.json` config; secrets
  managed in the Vercel dashboard.

## Tech Stack

- **Backend:** Vercel serverless function (Node.js 18+), `axios` (raw Anthropic Messages API)
- **Frontend:** Vanilla JavaScript and HTML (no build step)
- **External APIs:** Anthropic, Open-Meteo (geocoding + forecast)

## Project Structure

```
.
├── api/
│   └── chat.js    # Vercel serverless function: POST /api/chat
├── server/
│   ├── llm.js     # Anthropic client + intent-based routing (reused)
│   └── tools.js   # Weather tool (Open-Meteo) + intent / city helpers
├── client/
│   ├── index.html # Chat UI
│   └── app.js     # Frontend logic (fetch + render)
├── vercel.json    # Static rewrites + serverless routing
├── package.json
├── .env.example
└── README.md
```

## Setup

Requirements: Node.js 18+, the [Vercel CLI](https://vercel.com/docs/cli),
and an Anthropic API key.

```bash
# 1. Install dependencies (includes the Vercel CLI as a devDependency)
npm install

# 2. (optional) Install the Vercel CLI globally for convenience
npm install -g vercel

# 3. Configure local environment
cp .env.example .env
# then edit .env and set:
#   ANTHROPIC_API_KEY=sk-ant-...
#   ANTHROPIC_MODEL=claude-haiku-4-5   # optional
```

## Run Locally

```bash
npx vercel dev
```

Then open <http://localhost:3000> in your browser. `vercel dev` serves the
static frontend from `client/` and runs `api/chat.js` as a local serverless
function — the same way they run in production.

You can also call the API directly:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the weather in Paris?"}'
```

Try messages like:

- `What's the weather in Tokyo?`
- `Forecast for New York`
- `Explain recursion in one paragraph.`

## Deploying to Vercel

The project is configured for one-command Vercel deployment. The static UI
in `client/` is served at `/` and the serverless function in `api/chat.js`
is exposed at `POST /api/chat`.

```bash
# 1. Install the Vercel CLI (skip if already installed)
npm install -g vercel

# 2. Authenticate
vercel login

# 3. Link the project (first time only) and deploy a preview
vercel deploy

# 4. Promote to production
vercel deploy --prod
```

### Environment variables on Vercel

Do **not** commit a `.env` file. Set secrets in the Vercel dashboard under
**Project → Settings → Environment Variables** for each scope you need
(Production, Preview, Development):

- `ANTHROPIC_API_KEY` — required
- `ANTHROPIC_MODEL` — optional (defaults to `claude-haiku-4-5`)

After updating env vars, redeploy (or run `vercel env pull` to sync them
into a local `.env` for `vercel dev`).

## How It Works

1. The browser sends `POST /api/chat` with `{ message }` to the Vercel
   serverless function defined in `api/chat.js`.
2. The function delegates to `handleMessage()` in `server/llm.js`, which
   runs a lightweight intent detector from `server/tools.js`.
3. If the message looks like a weather question, it extracts a city and
   calls Open-Meteo's geocoding + forecast APIs, then returns a
   human-readable summary.
4. Otherwise, the message is forwarded to Anthropic's `claude-haiku-4-5`
   and the response is returned to the client.

## Security Notes

- **Never commit `.env`.** It is listed in `.gitignore`; verify with `git status` before every push.
- **Use environment variables for all secrets.** The server reads `ANTHROPIC_API_KEY` via `process.env` only (`server/llm.js`); no key is ever hardcoded or shipped to the browser.
- **Frontend never sees the key.** All Anthropic calls go through `POST /api/chat` on the serverless backend.
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
