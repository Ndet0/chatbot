# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # install dependencies
npm start            # run production server
npm run dev          # run with nodemon auto-reload (development)
```

No linter or test suite is configured. The server starts on `http://localhost:3000` by default.

Quick API test:
```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is the weather in Paris?"}'
```

## Environment

Copy `.env.example` to `.env` and fill in:
- `ANTHROPIC_API_KEY` — required for non-weather messages
- `ANTHROPIC_MODEL` — optional, defaults to `claude-haiku-4-5`
- `PORT` — optional, defaults to 3000

## Architecture

This is a Node.js/Express backend (`"type": "module"`, ES modules throughout) that serves a vanilla JS frontend from `client/`.

**Request flow:**
1. Browser POSTs `{ message }` to `POST /chat`
2. `server/llm.js` → `handleMessage()` calls `detectIntent()` (keyword match in `server/tools.js`)
3. If intent is `"weather"`: `extractCity()` parses the city name, then `getWeather()` calls Open-Meteo geocoding + forecast APIs (no key needed)
4. If intent is `"general"`: message goes to the Anthropic Messages API via raw `axios` POST (not the Anthropic SDK)

**Key design notes:**
- The Anthropic API is called directly with `axios`, not via `@anthropic-ai/sdk`. The call is in `server/llm.js:askLLM()` and uses `x-api-key` / `anthropic-version` headers manually.
- Intent detection is purely keyword-based — there is no LLM tool-calling/function-calling in place yet. The README notes upgrading to real tool use as a future improvement.
- The server has no session/conversation memory; each `POST /chat` is stateless.
- Frontend (`client/app.js`) communicates only via `POST /chat` and renders plain text (no Markdown).
