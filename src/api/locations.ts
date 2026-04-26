import { useQuery } from '@tanstack/react-query'
import {
  apiFetchAuthed,
  type LocationDto,
  type LocationStateDto,
} from './client'
import { useGameStore } from '@/game/store'

export function fetchLocations() {
  return apiFetchAuthed<LocationDto[]>('/locations')
}

export function fetchLocationState(id: string, userTime: string) {
  return apiFetchAuthed<LocationStateDto>(
    `/locations/${encodeURIComponent(id)}/state`,
    { headers: { 'x-user-time': userTime } },
  )
}

export function useLocations() {
  const accessToken = useGameStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['locations'],
    enabled: Boolean(accessToken),
    queryFn: fetchLocations,
  })
}

export function useLocationState(id: string | undefined) {
  const accessToken = useGameStore((s) => s.accessToken)
  const timeOverride = useGameStore((s) => s.timeOverride)
  // Key by the override so flipping the time changer triggers a refetch.
  // When there's no override we use 'live' as the key and resolve the real
  // clock inside `queryFn` (otherwise we'd change the key on every render).
  return useQuery({
    queryKey: ['location-state', id, timeOverride ?? 'live'],
    enabled: Boolean(id && accessToken),
    queryFn: () =>
      fetchLocationState(
        id as string,
        timeOverride ?? new Date().toISOString(),
      ),
  })
}
