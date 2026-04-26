import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AvatarStyle } from './avatars'
import type { components } from '@/api/openapi'

type AuthTokenDto = components['schemas']['AuthTokenDto']
type AuthUserDto = components['schemas']['AuthUserDto']

export type PlayerSex = 'male' | 'female' | 'non_binary'

export type UiLanguage = 'en-US' | 'ru'

export const UI_LANGUAGES: UiLanguage[] = ['en-US', 'ru']

export const DEFAULT_UI_LANGUAGE: UiLanguage = 'en-US'

export type AvatarCosmetics = { style: AvatarStyle; seed: string }

type GameState = {
  // Auth tokens issued by POST /auth/google. `accessTokenExpiresAt` is a Unix
  // timestamp in seconds (UTC) — identical to the access JWT `exp` claim — and
  // is used for proactive refresh.
  accessToken: string | null
  accessTokenExpiresAt: number | null
  refreshToken: string | null
  // Cached `/auth/me` response. Persisted so the header can render the user
  // identity on cold start before the request resolves.
  authUser: AuthUserDto | null

  // Active avatar id. A user may own many avatars on the backend; this is
  // the one currently "playing".
  avatarId: string | null
  // Mirror of the active avatar's cosmetics for fast access in render paths.
  avatarStyle: AvatarStyle | null
  avatarSeed: string | null
  // Cosmetic style/seed per avatar id. Lets the picker show stable previews
  // and lets switching avatars restore the previously chosen style/seed.
  avatarCosmetics: Record<string, AvatarCosmetics>

  currentLocationId: string | null
  // Session-only: lets the player pretend it's a different time of day when
  // asking the server for a location state. `null` means "use real wall clock".
  timeOverride: string | null
  // Preferred UI language. Persisted across sessions.
  uiLanguage: UiLanguage
  // Persisted id of the player's system assistant chat. The backend keeps
  // these long-lived per avatar, so caching the id avoids creating a new
  // chat on every page load.
  systemChatId: string | null

  setSession: (tokens: AuthTokenDto) => void
  clearSession: () => void
  setAuthUser: (user: AuthUserDto | null) => void

  setActiveAvatar: (input: {
    id: string
    style?: AvatarStyle
    seed?: string
  }) => void
  clearActiveAvatar: () => void
  setAvatarCosmetics: (id: string, cosmetics: AvatarCosmetics) => void

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
      accessToken: null,
      accessTokenExpiresAt: null,
      refreshToken: null,
      authUser: null,

      avatarId: null,
      avatarStyle: null,
      avatarSeed: null,
      avatarCosmetics: {},

      currentLocationId: null,
      timeOverride: null,
      uiLanguage: detectDefaultLanguage(),
      systemChatId: null,

      setSession: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          accessTokenExpiresAt: tokens.accessTokenExpiresAt,
          refreshToken: tokens.refreshToken,
        }),
      clearSession: () =>
        set((s) => ({
          accessToken: null,
          accessTokenExpiresAt: null,
          refreshToken: null,
          authUser: null,
          avatarId: null,
          avatarStyle: null,
          avatarSeed: null,
          // Drop per-avatar cosmetics so a different Google account starting
          // fresh on this browser doesn't see stale previews.
          avatarCosmetics: {},
          currentLocationId: null,
          systemChatId: null,
          // Preserve the UI language across logout — it's a preference,
          // not profile data.
          uiLanguage: s.uiLanguage,
        })),
      setAuthUser: (user) => set({ authUser: user }),

      setActiveAvatar: ({ id, style, seed }) =>
        set((s) => {
          const existing = s.avatarCosmetics[id]
          const nextStyle = style ?? existing?.style ?? 'adventurer'
          const nextSeed =
            seed ??
            existing?.seed ??
            Math.random().toString(36).slice(2, 10)
          return {
            avatarId: id,
            avatarStyle: nextStyle,
            avatarSeed: nextSeed,
            avatarCosmetics: {
              ...s.avatarCosmetics,
              [id]: { style: nextStyle, seed: nextSeed },
            },
          }
        }),
      clearActiveAvatar: () =>
        set({
          avatarId: null,
          avatarStyle: null,
          avatarSeed: null,
          currentLocationId: null,
          systemChatId: null,
        }),
      setAvatarCosmetics: (id, cosmetics) =>
        set((s) => ({
          avatarCosmetics: { ...s.avatarCosmetics, [id]: cosmetics },
          // If we're updating the active avatar, mirror the new values onto
          // the root so render paths pick them up immediately.
          ...(s.avatarId === id
            ? { avatarStyle: cosmetics.style, avatarSeed: cosmetics.seed }
            : {}),
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
      // Bumped from v2 → v3 along with the Google auth + multi-avatar refactor.
      // No migrate function: any older persisted state is discarded so the
      // user is forced through the new sign-in flow.
      version: 3,
      partialize: (state) => ({
        accessToken: state.accessToken,
        accessTokenExpiresAt: state.accessTokenExpiresAt,
        refreshToken: state.refreshToken,
        authUser: state.authUser,
        avatarId: state.avatarId,
        avatarStyle: state.avatarStyle,
        avatarSeed: state.avatarSeed,
        avatarCosmetics: state.avatarCosmetics,
        currentLocationId: state.currentLocationId,
        uiLanguage: state.uiLanguage,
        systemChatId: state.systemChatId,
      }),
    },
  ),
)
