import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AvatarStyle } from './avatars'

export type PlayerSex = 'male' | 'female' | 'non_binary'

export type UiLanguage = 'en-US' | 'ru'

export const UI_LANGUAGES: UiLanguage[] = ['en-US', 'ru']

export const DEFAULT_UI_LANGUAGE: UiLanguage = 'en-US'

export type PlayerProfile = {
  id: string
  firstName: string
  lastName: string
  age: number
  sex: PlayerSex
  title: string
  backstory: string
  avatarStyle: AvatarStyle
  avatarSeed: string
}

type ChatKey = string

function chatKey(placeId: string, characterId: string): ChatKey {
  return `${placeId}::${characterId}`
}

type GameState = {
  player: PlayerProfile | null
  currentLocationId: string | null
  // Session-only: lets us reuse the same chat id while the player hops
  // between a character card and the conversation screen, without carrying
  // stale ownership across reloads.
  chatIdByNpcPlace: Record<ChatKey, string>
  // Session-only: lets the player pretend it's a different time of day when
  // asking the server for a location state. `null` means "use real wall clock".
  timeOverride: string | null
  // Preferred UI language. Persisted across sessions.
  uiLanguage: UiLanguage
  // Persisted id of the player's system assistant chat. The backend keeps
  // these long-lived per user, so caching the id avoids creating a new
  // chat on every page load.
  systemChatId: string | null
  setPlayer: (player: PlayerProfile) => void
  clearPlayer: () => void
  setCurrentLocation: (id: string | null) => void
  getChatId: (placeId: string, characterId: string) => string | undefined
  rememberChatId: (placeId: string, characterId: string, chatId: string) => void
  forgetChatId: (placeId: string, characterId: string) => void
  setTimeOverride: (iso: string | null) => void
  setUiLanguage: (language: UiLanguage) => void
  setSystemChatId: (id: string | null) => void
  forgetSystemChatId: () => void
}

function detectDefaultLanguage(): UiLanguage {
  if (typeof navigator === 'undefined') return DEFAULT_UI_LANGUAGE
  const langs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language]
  for (const l of langs) {
    const lower = l.toLowerCase()
    if (lower.startsWith('ru')) return 'ru'
    if (lower.startsWith('en')) return 'en-US'
  }
  return DEFAULT_UI_LANGUAGE
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      player: null,
      currentLocationId: null,
      chatIdByNpcPlace: {},
      timeOverride: null,
      uiLanguage: detectDefaultLanguage(),
      systemChatId: null,
      setPlayer: (player) => set({ player }),
      clearPlayer: () =>
        set((s) => ({
          player: null,
          currentLocationId: null,
          chatIdByNpcPlace: {},
          timeOverride: null,
          // Preserve the UI language across logout — it's a preference,
          // not profile data.
          uiLanguage: s.uiLanguage,
          systemChatId: null,
        })),
      setCurrentLocation: (id) => set({ currentLocationId: id }),
      getChatId: (placeId, characterId) =>
        get().chatIdByNpcPlace[chatKey(placeId, characterId)],
      rememberChatId: (placeId, characterId, chatId) =>
        set((s) => ({
          chatIdByNpcPlace: {
            ...s.chatIdByNpcPlace,
            [chatKey(placeId, characterId)]: chatId,
          },
        })),
      forgetChatId: (placeId, characterId) =>
        set((s) => {
          const copy = { ...s.chatIdByNpcPlace }
          delete copy[chatKey(placeId, characterId)]
          return { chatIdByNpcPlace: copy }
        }),
      setTimeOverride: (iso) => set({ timeOverride: iso }),
      setUiLanguage: (language) => set({ uiLanguage: language }),
      setSystemChatId: (id) => set({ systemChatId: id }),
      forgetSystemChatId: () => set({ systemChatId: null }),
    }),
    {
      name: 'gpt-city-game',
      storage: createJSONStorage(() => localStorage),
      // v5 adds `systemChatId` — id of the player's persistent assistant
      // chat used by the global "Game Assistant" panel.
      version: 5,
      partialize: (state) => ({
        player: state.player,
        currentLocationId: state.currentLocationId,
        uiLanguage: state.uiLanguage,
        systemChatId: state.systemChatId,
      }),
      migrate: (state, fromVersion) => {
        if (fromVersion < 2) {
          return {
            player: null,
            currentLocationId: null,
            chatIdByNpcPlace: {},
            timeOverride: null,
            uiLanguage: detectDefaultLanguage(),
            systemChatId: null,
          } as GameState
        }
        const s = state as Partial<GameState> & {
          chatIdByNpcPlace?: unknown
          chatLanguage?: unknown
          uiLanguage?: unknown
          systemChatId?: unknown
        }
        if (fromVersion < 4) {
          return {
            player: s.player ?? null,
            currentLocationId: s.currentLocationId ?? null,
            chatIdByNpcPlace: {},
            timeOverride: null,
            uiLanguage:
              (s.uiLanguage as UiLanguage | undefined) ??
              (s.chatLanguage as UiLanguage | undefined) ??
              detectDefaultLanguage(),
            systemChatId: null,
          } as GameState
        }
        if (fromVersion < 5) {
          return {
            ...(s as GameState),
            systemChatId:
              typeof s.systemChatId === 'string' ? s.systemChatId : null,
          } as GameState
        }
        return state as GameState
      },
    },
  ),
)
