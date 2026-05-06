# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npx vercel dev       # local dev (serves client/ + runs api/ as serverless functions)
npm run deploy       # preview deployment to Vercel
npm run deploy:prod  # production deployment to Vercel
```

Do NOT wrap `vercel dev` in an npm script named `dev`/`start` — Vercel re-reads `package.json` on startup and will recursively invoke itself, aborting with "must not recursively invoke itself".

No linter or test suite is configured. `vercel dev` serves on `http://localhost:3000` by default.

Quick API test:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the weather in Paris?"}'
```

## Environment

Copy `.env.example` to `.env` and fill in:
- `ANTHROPIC_API_KEY` — required for non-weather messages
- `ANTHROPIC_MODEL` — optional, defaults to `claude-haiku-4-5`

`.env` is only used locally by `vercel dev`. For deployed environments, set vars in the Vercel dashboard (Project → Settings → Environment Variables).

## Architecture

Vercel serverless deployment (`"type": "module"`, ES modules throughout). Static frontend in `client/` is served by Vercel's static file handler; backend logic lives in `api/` as serverless functions.

**Layout:**
- `api/chat.js` — serverless function entry point exporting `default async function handler(req, res)`. Validates the request, then delegates to `server/llm.js`.
- `server/llm.js` — `handleMessage()`, `detectIntent()` (keyword match), `askLLM()` (raw Anthropic Messages API call via `axios`).
- `server/tools.js` — `extractCity()` and `getWeather()` (Open-Meteo geocoding + forecast, no key needed).
- `client/` — vanilla JS frontend (`index.html`, `app.js`, styles).
- `vercel.json` — rewrites: `/` → `/client/index.html`, `/(non-api)` → `/client/$1`. The `/api/*` routes are auto-detected by Vercel from the `api/` directory and must NOT be rewritten.

**Request flow:**
1. Browser POSTs `{ message }` to `POST /api/chat`.
2. `api/chat.js` validates and calls `handleMessage(trimmed)` from `server/llm.js`.
3. `detectIntent()` keyword-matches the message.
4. If `"weather"`: `extractCity()` parses the city, `getWeather()` hits Open-Meteo.
5. If `"general"`: message goes to Anthropic Messages API via raw `axios` POST (not the Anthropic SDK), using `x-api-key` / `anthropic-version` headers.

**Key design notes:**
- The Anthropic API is called directly with `axios`, not via `@anthropic-ai/sdk`.
- Intent detection is purely keyword-based — there is no LLM tool-calling/function-calling in place yet.
- The handler is stateless; each `POST /api/chat` is independent (no session/conversation memory).
- Frontend (`client/app.js`) communicates only via `POST /api/chat` and renders plain text (no Markdown).
- The legacy Express bootstrap (`server/index.js`) was removed during the Vercel migration; only the `server/llm.js` + `server/tools.js` modules remain, imported by `api/chat.js`.
