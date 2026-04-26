import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AvatarStyle } from './avatars'

export type PlayerSex = 'male' | 'female' | 'non_binary'

export type UiLanguage = 'en-US' | 'ru'

export const UI_LANGUAGES: UiLanguage[] = ['en-US', 'ru']

export const DEFAULT_UI_LANGUAGE: UiLanguage = 'en-US'

type GameState = {
  // Persisted user identity. Profile fields (name, age, etc.) live on the
  // server and are fetched via `useCurrentUser` instead of being mirrored
  // here.
  userId: string | null
  // Avatar selection is a client-only preference that the backend does not
  // know about, so we keep it persisted alongside the user id.
  avatarStyle: AvatarStyle | null
  avatarSeed: string | null
  currentLocationId: string | null
  // Session-only: lets the player pretend it's a different time of day when
  // asking the server for a location state. `null` means "use real wall clock".
  timeOverride: string | null
  // Preferred UI language. Persisted across sessions.
  uiLanguage: UiLanguage
  // Persisted id of the player's system assistant chat. The backend keeps
  // these long-lived per user, so caching the id avoids creating a new
  // chat on every page load.
  systemChatId: string | null
  setUser: (user: {
    id: string
    avatarStyle: AvatarStyle
    avatarSeed: string
  }) => void
  clearUser: () => void
  setCurrentLocation: (id: string | null) => void
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
    (set) => ({
      userId: null,
      avatarStyle: null,
      avatarSeed: null,
      currentLocationId: null,
      timeOverride: null,
      uiLanguage: detectDefaultLanguage(),
      systemChatId: null,
      setUser: ({ id, avatarStyle, avatarSeed }) =>
        set({ userId: id, avatarStyle, avatarSeed }),
      clearUser: () =>
        set((s) => ({
          userId: null,
          avatarStyle: null,
          avatarSeed: null,
          currentLocationId: null,
          timeOverride: null,
          // Preserve the UI language across logout — it's a preference,
          // not profile data.
          uiLanguage: s.uiLanguage,
          systemChatId: null,
        })),
      setCurrentLocation: (id) => set({ currentLocationId: id }),
      setTimeOverride: (iso) => set({ timeOverride: iso }),
      setUiLanguage: (language) => set({ uiLanguage: language }),
      setSystemChatId: (id) => set({ systemChatId: id }),
      forgetSystemChatId: () => set({ systemChatId: null }),
    }),
    {
      name: 'gpt-city-game',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        userId: state.userId,
        avatarStyle: state.avatarStyle,
        avatarSeed: state.avatarSeed,
        currentLocationId: state.currentLocationId,
        uiLanguage: state.uiLanguage,
        systemChatId: state.systemChatId,
      }),
    },
  ),
)
