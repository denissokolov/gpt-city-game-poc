import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AvatarStyle } from './avatars'

export type PlayerSex = 'male' | 'female' | 'non_binary'

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
  setPlayer: (player: PlayerProfile) => void
  clearPlayer: () => void
  setCurrentLocation: (id: string | null) => void
  getChatId: (placeId: string, characterId: string) => string | undefined
  rememberChatId: (placeId: string, characterId: string, chatId: string) => void
  forgetChatId: (placeId: string, characterId: string) => void
  setTimeOverride: (iso: string | null) => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      player: null,
      currentLocationId: null,
      chatIdByNpcPlace: {},
      timeOverride: null,
      setPlayer: (player) => set({ player }),
      clearPlayer: () =>
        set({
          player: null,
          currentLocationId: null,
          chatIdByNpcPlace: {},
          timeOverride: null,
        }),
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
    }),
    {
      name: 'gpt-city-game',
      storage: createJSONStorage(() => localStorage),
      // v3 stops persisting `chatIdByNpcPlace` — chat ids are now
      // session-only, so a page reload always starts fresh conversations
      // and we can't resurrect chats owned by a previous backend user.
      version: 3,
      partialize: (state) => ({
        player: state.player,
        currentLocationId: state.currentLocationId,
      }),
      migrate: (state, fromVersion) => {
        if (fromVersion < 2) {
          return {
            player: null,
            currentLocationId: null,
            chatIdByNpcPlace: {},
            timeOverride: null,
          } as GameState
        }
        if (fromVersion < 3) {
          const s = state as Partial<GameState> & {
            chatIdByNpcPlace?: unknown
          }
          return {
            player: s.player ?? null,
            currentLocationId: s.currentLocationId ?? null,
            chatIdByNpcPlace: {},
            timeOverride: null,
          } as GameState
        }
        return state as GameState
      },
    },
  ),
)
