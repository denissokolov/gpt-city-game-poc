import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AvatarStyle } from './avatars'

export type PlayerProfile = {
  name: string
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
  chatIdByNpcPlace: Record<ChatKey, string>
  setPlayer: (player: PlayerProfile) => void
  clearPlayer: () => void
  setCurrentLocation: (id: string | null) => void
  getChatId: (placeId: string, characterId: string) => string | undefined
  rememberChatId: (placeId: string, characterId: string, chatId: string) => void
  forgetChatId: (placeId: string, characterId: string) => void
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      player: null,
      currentLocationId: null,
      chatIdByNpcPlace: {},
      setPlayer: (player) => set({ player }),
      clearPlayer: () =>
        set({ player: null, currentLocationId: null, chatIdByNpcPlace: {} }),
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
    }),
    {
      name: 'gpt-city-game',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)
