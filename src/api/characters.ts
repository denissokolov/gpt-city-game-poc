import { useQuery } from '@tanstack/react-query'
import { apiFetchAuthed, type CharacterDto } from './client'
import { useGameStore } from '@/game/store'

export function fetchCharacters() {
  return apiFetchAuthed<CharacterDto[]>('/characters')
}

export function useCharacters() {
  const accessToken = useGameStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['characters'],
    enabled: Boolean(accessToken),
    queryFn: fetchCharacters,
  })
}
