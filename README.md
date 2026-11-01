# GPT City — Browser Game

Browser client for **GPT City**, a chat game where every character is an AI actor with its own personality, backstory, mood and memory. Create an avatar, walk a stylized city map, step into locations and talk to whoever is there. The characters remember you between visits. A built-in system assistant lets you build your own world (characters, locations, places) just by chatting with it.

The backend is [gpt-city-api](https://github.com/denissokolov/gpt-city-api). By default the client talks to its public staging deployment, so no local API is needed.

- **Staging API:** https://gpt-city-api-5950170b319a.herokuapp.com
- **API explorer:** https://gpt-city-api-5950170b319a.herokuapp.com/doc

## Features

- **Google sign-in** and several avatars per account, each with its own name, age, backstory and DiceBear look.
- **City map.** Locations are rendered as nodes; walk between neighbours with animated transitions.
- **Living locations.** Each place shows which NPCs are there right now and what they're doing. Placement depends on your local time of day, and a time changer (dawn → night) lets you see how the city shifts.
- **Streaming in-character chats.** If you stay quiet, the character notices and reacts to the silence (the idle timeout comes from the server).
- **System assistant.** A side panel chat with an admin co-pilot that creates and edits characters, locations and places through server-side tools. Tool calls are shown inline as they run.
- **English and Russian UI.** Characters reply in your language.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS, Framer Motion
- React Router v6
- TanStack Query for REST, with types generated from the API's OpenAPI spec (`openapi-typescript`)
- Zustand + `persist` (auth tokens, active avatar, UI language, current location, system chat)
- `@ai-sdk/react` `useChat` + `DefaultChatTransport` for streaming chats
- `@react-oauth/google` (Google Identity Services, ID-token sign-in + One Tap)
- DiceBear avatars (deterministic, no assets to ship)

## Getting started

```bash
npm install
cp .env.example .env.local   # set VITE_GOOGLE_CLIENT_ID
npm run dev                  # http://localhost:5173
```

```
VITE_GOOGLE_CLIENT_ID=xxxxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
# VITE_API_BASE_URL=http://localhost:3000   # defaults to staging
```

### Google sign-in

Create a Web OAuth 2.0 client ID in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (*Create credentials → OAuth client ID → Web application*) and add your dev origin (e.g. `http://localhost:5173`) to **Authorized JavaScript origins**.

The client exchanges the Google ID token at `POST /auth/google` for an application JWT and refresh token (stored in `localStorage`). The access token is refreshed proactively before expiry and again on any `401`.

## Scripts

- `npm run dev`: Vite dev server
- `npm run build`: type-check and production build
- `npm run preview`: serve the production build locally
- `npm start`: serve `dist/` (used in production, see `Procfile`)
- `npm run lint` / `npm run format`: ESLint / Prettier
- `npm run gen:api`: regenerate `src/api/openapi.d.ts` from the deployed `/openapi.json`

## Screens

| Route | What it does |
| --- | --- |
| `/login` | Google sign-in |
| `/onboarding` | Create an avatar (prefilled from your Google profile) |
| `/avatars` | Pick, switch or create avatars |
| `/map` | City map; click a neighbouring location to walk there |
| `/location/:id` | Places in the location and the NPCs currently in each, with their mood and activity; tap one to start a chat |
| `/chat/:chatId` | Streaming conversation with a character |

The system assistant panel is available from the game screens.

## How it talks to the API

Every authenticated request sends `Authorization: Bearer <jwt>` and `x-locale` (UI language). Requests that act as an avatar also send `x-avatar-id`.

- `POST /auth/google`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- `GET /avatars`, `POST /avatars`, `GET /avatars/current`, `PATCH /avatars/:id`
- `GET /locations`, plus `GET /locations/:id/state`, which sends the player's local time as `x-user-time` so NPCs are placed by time of day
- `GET /characters`
- `POST /chats` and `POST /chats/:id/message` (UI-message stream consumed by `useChat`)
- `GET|POST /system-chats`, `DELETE /system-chats/:id`, `GET|POST /system-chats/:id/messages`

The server currently uses only the first entry of `characterIds` when creating a chat; group chats are a stretch goal.

## Project layout

```
src/
  api/          typed OpenAPI client + TanStack Query hooks per resource
  components/   shared UI (NpcCard, StreamingText, TimeChanger, SystemChat/, ...)
  game/         Zustand store, DiceBear helpers, city map layout
  i18n/         English and Russian messages
  screens/      Login, Onboarding, AvatarPicker, Map, Location, Chat
  App.tsx       router with auth/avatar guards
```
