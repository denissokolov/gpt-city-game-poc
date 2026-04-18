import { useQuery } from '@tanstack/react-query'
import { apiFetch, type CharacterDto } from './client'

export function fetchCharacters() {
  return apiFetch<CharacterDto[]>('/characters')
}

export function useCharacters() {
  return useQuery({
    queryKey: ['characters'],
    queryFn: fetchCharacters,
  })
}
