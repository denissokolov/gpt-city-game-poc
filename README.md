# GPT City — Browser Game

A standalone browser game where you create your own avatar, walk a stylized
city map, enter locations, and chat with AI NPCs streamed from the GPT City
API.

The backend is consumed directly from the public staging deployment — no local
API is required.

- **Staging API:** `https://gpt-city-api-5950170b319a.herokuapp.com`
- **API explorer:** `https://gpt-city-api-5950170b319a.herokuapp.com/doc`

The browser talks to the staging API directly. Set `VITE_API_BASE_URL` to
point at a different host (e.g. a local backend).

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS
- React Router v6
- TanStack Query (REST caching)
- Zustand + `persist` (auth tokens, active avatar, per-avatar cosmetics,
  current location, `systemChatId`)
- `@react-oauth/google` (Google Identity Services, ID-token sign-in + One Tap)
- `@ai-sdk/react` `useChat` + `DefaultChatTransport` (streaming chat with
  `Authorization: Bearer <jwt>` and `x-avatar-id`)
- Framer Motion (map walk transitions, message animations)
- DiceBear avatars (deterministic, no assets to ship)

## Getting started

```bash
npm install
npm run gen:api       # regenerate src/api/openapi.d.ts from the live spec
npm run dev           # http://localhost:5173
```

Copy `.env.example` to `.env.local` (or `.env`) and add at minimum a Google
OAuth client id; optionally point at a different backend:

```
VITE_GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
# VITE_API_BASE_URL=http://localhost:3000
```

### Google sign-in

The app authenticates via Google Sign-In. Create a Web OAuth 2.0 client id in
the [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
(*Create credentials → OAuth client ID → Web application*) and add your dev
origin (e.g. `http://localhost:5173`) to **Authorized JavaScript origins**.
Paste the resulting client id into `VITE_GOOGLE_CLIENT_ID`.

The frontend exchanges the Google ID token at `POST /auth/google` for an
application JWT + refresh token (stored in `localStorage`). The access token
is refreshed proactively before expiry and reactively on `401`.

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — type-check + production build
- `npm run preview` — serve the production build
- `npm run gen:api` — regenerate OpenAPI types from the deployed `/openapi.json`

## Screens

- `/onboarding` — pick a name, age, sex, and DiceBear avatar; the app calls
  `POST /users` and caches the returned user id in `localStorage`
- `/map` — fetched locations rendered as city nodes; click a neighbor to walk
- `/location/:id` — places and the NPCs currently standing in each one; tap
  an NPC to jump straight into a chat at that place
- `/chat/:chatId` — streaming conversation via `POST /chats/:id/message`

## API endpoints used

- `POST /users` — called once during onboarding; returns a `UserDto` whose
  `id` is used as `x-user-id` on every authenticated request
- `GET /characters`
- `GET /locations` — list of `LocationDto` summaries (id, name, description,
  locale)
- `GET /locations/:id/state` — `LocationStateDto` with `places[]`, each place
  carrying the characters currently there; sends the caller's local time as
  the `x-user-time` header so the server can place NPCs by local time of day
- `POST /chats` — one-time per `(placeId, characterId)` pair; requires
  `x-user-id`; `chatId` cached in `localStorage`
- `POST /chats/:id/message` — UI-message streaming consumed by `useChat`;
  requires `x-user-id`

## Known server-side quirks

- The server currently only consumes `characterIds[0]` — group chats are a
  stretch goal.
- NPC placement in `GET /locations/:id/state` depends on the `x-user-time`
  header; a missing or stale value will place characters at the server's
  idea of "now".

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
