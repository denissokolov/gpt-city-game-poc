---
name: new-feature
description: Build a new feature for the GPT City game based on a user-provided description. Use when the user asks to add, build, implement, or create a new feature, gameplay element, character behavior, or UI flow in this game project. Always plans before implementing and refreshes API types from the live OpenAPI spec first.
---

# New Feature

Workflow for adding a new feature to the GPT City game POC. The game is a city inhabited by AI agents; features typically combine API calls (characters, personalities, city state) with React UI.

## Workflow

Follow these steps in order. Do not skip steps.

### 1. Switch to Plan mode

Always start in Plan mode. Call `SwitchMode` with `target_mode_id: "plan"` before doing anything else. The user must approve the plan before implementation begins.

### 2. Refresh the API types

Run the API type generator first so plans reference current types:

```bash
npm run gen:api
```

This rewrites `src/api/openapi.d.ts` from the live OpenAPI spec at `https://gpt-city-api-5950170b319a.herokuapp.com/openapi.json`. Treat any resulting diff as expected.

### 3. Gather authoritative API details

Use these sources to understand which endpoints, request bodies, and response shapes the feature needs:

- `src/api/openapi.d.ts` — generated TypeScript types; the source of truth for shapes used in code.
- `https://gpt-city-api-5950170b319a.herokuapp.com/doc` — human-readable web documentation with descriptions, examples, and behavior notes that are not in the generated types. Fetch this page when the user description is ambiguous or when endpoint semantics matter.
- The `user-gpt-city-api` MCP server — exposes tools for managing characters and city state; check its descriptors when the feature touches gameplay actions already covered by tools.

### 4. Explore the relevant code

Before planning, locate existing patterns to follow:

- API client / fetchers (look for usages of types from `src/api/openapi.d.ts`).
- React Query hooks (`@tanstack/react-query`) for data fetching and mutations.
- Zustand stores for client state.
- Routing in `react-router-dom`.
- i18n usage in `.tsx` files (see `.cursor/rules/tsx-i18n.mdc` if the feature touches user-facing strings).

### 5. Produce the plan

Present a concise plan covering:

- Feature summary restated from the user's description.
- API endpoints involved, with request/response types referenced from `src/api/openapi.d.ts`.
- New or modified files (components, hooks, stores, routes, types).
- UI/UX outline for any visible changes.
- Open questions or assumptions.

Wait for user approval before switching back to Agent mode and implementing.

### 6. Implement after approval

Once approved:

- Switch back to Agent mode.
- Reuse existing fetcher/hook/store patterns rather than introducing new ones.
- Type all API interactions through `src/api/openapi.d.ts` (no `any`).
- For new user-facing strings in `.tsx`, follow `.cursor/rules/tsx-i18n.mdc`.
- Run `npm run lint` after substantive changes and fix any issues introduced.

## Notes

- If `npm run gen:api` fails (network, schema change), report the failure in the plan instead of guessing types.
- Do not commit unless the user explicitly asks.
- The regenerated `src/api/openapi.d.ts` may show as modified even if no feature change has been made yet; that is expected.
