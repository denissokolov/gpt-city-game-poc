---
name: sync-system-chat-tools
description: Sync the System Chat tool dictionary in src/i18n/messages.ts with the current set of server tools — adding new entries, renaming changed ones, and removing retired ones. Use when the user asks to sync, refresh, or update tools for the system chat, fix tool labels, or when the assistant shows a tool with an auto-humanized fallback name instead of a translated label.
---

# Sync System Chat Tools

The System Chat assistant calls server-defined tools (e.g. `create-character`, `list-locations`). Each tool is rendered by `src/components/SystemChat/ToolInvocation.tsx`, which looks up a localized label in the `systemChat.tools` dictionary in `src/i18n/messages.ts`. When the dictionary is out of sync with the server, users see auto-humanized fallback labels ("Update Place" rendered correctly by accident) or stale entries for tools that no longer exist.

This skill keeps that dictionary aligned with the current server tool surface.

## Source of truth

The **live `gpt-city-api` MCP server** is the single authoritative source. Its endpoint is `${API_BASE_URL}/mcp` — by default `https://gpt-city-api-5950170b319a.herokuapp.com/mcp` (see `STAGING_API` in `src/api/client.ts`). Query it with a JSON-RPC `tools/list` request — the response's `tools[].name` array is the canonical kebab-case tool list, and each tool's `description` is the best hint for labels.

The local Cursor cache at `mcps/user-gpt-city-api/tools/<tool>.json` mirrors what Cursor's MCP client loaded **the last time it connected** to the server. It is a useful quick reference but **can be stale** when the server has added or renamed tools since Cursor last refreshed — so always verify against the live endpoint before reporting "no diff".

Do NOT invent tools, infer them from REST endpoints in `src/api/openapi.d.ts`, or trust stale code comments. Tool names the user mentions are a useful hint that the local cache may be out of date — verify them against the live MCP `tools/list`, and only add them to the dictionary if the live server confirms them.

## Workflow

### 1. Discover the current server tools

Fetch the live tool list directly from the MCP endpoint with a JSON-RPC `tools/list` request:

```bash
curl -sS -X POST "${API_BASE_URL:-https://gpt-city-api-5950170b319a.herokuapp.com}/mcp" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

The response's `result.tools[].name` values are the canonical kebab-case keys; each tool's `description` is the best hint for the label.

You may also `ls mcps/user-gpt-city-api/tools/` for a quick local snapshot — but treat any difference between that listing and the live response as the local cache being stale, and trust the live response.

### 2. Read the current dictionary

Read `src/i18n/messages.ts` and locate **both** `systemChat.tools` blocks — one in the `en` dictionary and one in the `ru` dictionary. They must always have the same set of keys.

### 3. Compute the diff

- **Missing keys**: tool names returned by the live `tools/list` but absent from the dictionaries.
- **Stale keys**: tool names in the dictionaries that the live `tools/list` no longer returns.
- **Renamed keys**: a stale key plus a missing key that obviously refer to the same action (e.g. `delete-place` → `remove-place`). Treat this as a rename, not as add+remove of unrelated entries.

If the diff is empty, report that and stop — do not edit the file.

### 4. Update both dictionaries

For each change, edit `src/i18n/messages.ts` so that the `en` and `ru` `systemChat.tools` blocks have **identical key sets**.

Keys are always **kebab-case**. `ToolInvocation.tsx` normalizes incoming names (snake_case / camelCase / kebab-case) to kebab-case before lookup, so the dictionary side must use kebab-case.

Follow the existing labeling conventions:

- `en-US`: imperative verb + noun in title case — "Create character", "Update place", "List locations", "Look up character" (used for `get-*`).
- `ru`: imperative verb + noun in lowercase — "Создать персонажа", "Обновить место", "Список локаций", "Найти персонажа" (used for `get-*`).

Match noun grammatical case to nearby entries (e.g. Russian accusative for "create/update/delete" of an object, nominative for "list of …").

Insert new entries near related ones (group by `*-character`, `*-location`, `*-place`) so the file stays scannable.

### 5. Verify

After the edit:

- Confirm the `en` and `ru` `systemChat.tools` blocks have the same keys.
- Run `npm run lint` and fix any issues your edit introduced (TypeScript will not flag missing keys because the type is `Record<string, string>` — the parity check above is your safety net).

### 6. Report

Summarize for the user: added keys, removed keys, renamed keys, and the labels chosen for each new entry in both languages.

## Reference

- Renderer: `src/components/SystemChat/ToolInvocation.tsx` — note `normalizeToolKey` (kebab-case) and `humanizeToolName` (fallback).
- Type: `systemChat.tools: Record<string, string>` in the `Messages` type at the top of `src/i18n/messages.ts`.
- Related rule: `.cursor/rules/tsx-i18n.mdc` — every user-facing string must live in i18n.

## Anti-patterns

- Editing only one language's dictionary. Both must change together.
- Adding `snake_case` or `camelCase` keys. Keys are kebab-case.
- Generating labels from the key string ("Create Character" auto-cased). Write a real localized label that matches the existing tone.
- Removing a key just because it lacks a local descriptor file. The local `mcps/user-gpt-city-api/tools/` cache can lag behind the live server — always verify against the live `tools/list` endpoint before deleting entries.
- Reporting "no diff" based only on the local descriptor folder. The cache may be stale; cross-check against the live MCP endpoint at least once per sync.
