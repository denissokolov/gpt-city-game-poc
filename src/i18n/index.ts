import { useGameStore } from '@/game/store'
import { MESSAGES, type Messages } from './messages'

export function useT(): Messages {
  const language = useGameStore((s) => s.uiLanguage)
  return MESSAGES[language]
}

// Non-reactive accessor for code paths outside of React components
// (e.g. toast helpers). Callers should not cache the result — read
// it freshly each time so language switches are reflected.
export function getMessages(): Messages {
  return MESSAGES[useGameStore.getState().uiLanguage]
}

export type { Messages } from './messages'
