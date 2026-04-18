# GPT City — Browser Game

A standalone browser game where you create your own avatar, walk a stylized
city map, enter locations, and chat with AI NPCs streamed from the GPT City
API.

The backend is consumed directly from the public staging deployment — no local
API is required.

- **Staging API:** `https://gpt-city-api-5950170b319a.herokuapp.com`
- **API explorer:** `https://gpt-city-api-5950170b319a.herokuapp.com/doc`

In dev, browser requests go through a Vite proxy at `/api/*` so the streaming
`/chats/:id/message` response works (the staging API currently omits
`Access-Control-Allow-Origin` on streaming responses — see "Known server-side
quirks" below). For production, set `VITE_API_BASE_URL` to a host that can
reach the API without cross-origin issues.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS
- React Router v6
- TanStack Query (REST caching)
- Zustand + `persist` (player, current location, `chatId` per `(placeId, characterId)`)
- `@ai-sdk/react` `useChat` + `DefaultChatTransport` (streaming chat)
- Framer Motion (map walk transitions, message animations)
- DiceBear avatars (deterministic, no assets to ship)

## Getting started

```bash
npm install
npm run gen:api       # regenerate src/api/openapi.d.ts from the live spec
npm run dev           # http://localhost:5173
```

Copy `.env.example` to `.env.local` to override env vars (e.g. when iterating
against a local backend):

```
VITE_API_BASE_URL=http://localhost:3000
# or keep the proxy and just point it elsewhere:
VITE_API_PROXY_TARGET=http://localhost:3000
```

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — type-check + production build
- `npm run preview` — serve the production build
- `npm run gen:api` — regenerate OpenAPI types from the deployed `/openapi.json`

## Screens

- `/onboarding` — pick a name and DiceBear avatar (stored in `localStorage`)
- `/map` — fetched locations rendered as city nodes; click a neighbor to walk
- `/location/:id` — places + NPC cards; tap an NPC, pick a place, enter chat
- `/chat/:chatId` — streaming conversation via `POST /chats/:id/message`

## API endpoints used

- `GET /characters`
- `GET /locations`
- `GET /locations/:id`
- `POST /chats` — one-time per `(placeId, characterId)` pair; `chatId` cached
  in `localStorage`
- `POST /chats/:id/message` — UI-message streaming consumed by `useChat`

## Known server-side quirks

- CORS on the streaming endpoint: `GET /health` returns
  `Access-Control-Allow-Origin: http://localhost:5173`, but
  `POST /chats/:id/message`'s streaming response does **not** include the same
  header on the actual response body (only the OPTIONS preflight does). Until
  the API ships `app.enableCors({ origin: WEB_ORIGIN })` in `src/main.ts`,
  this repo works around it with a Vite dev proxy; production deploys should
  fix it server-side or host both front- and back-end on the same origin.
- Today `chats.service.ts` hard-codes the player's name as `"Denis"` in the
  system prompt. The UI renders the player's chosen name on their own bubbles;
  a follow-up PR against the API can thread `userName` through `SendMessageDto`.
- The server currently only consumes `characterIds[0]` — group chats are a
  stretch goal.

## Project layout

```
src/
  api/               REST + typed OpenAPI client, TanStack Query hooks
  components/        Shared UI (NpcCard, PlacePicker, Toaster, Skeleton)
  game/              Zustand store, DiceBear avatar helpers, city layout
  screens/           Onboarding, Map, Location, Chat
  lib/               cn() utility
  App.tsx            Router
  main.tsx           Query + Router providers
```
