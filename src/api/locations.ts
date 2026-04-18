import { useQuery } from '@tanstack/react-query'
import {
  apiFetch,
  type LocationDto,
  type LocationStateDto,
} from './client'
import { useGameStore } from '@/game/store'

export function fetchLocations() {
  return apiFetch<LocationDto[]>('/locations')
}

export function fetchLocationState(id: string, userTime: string) {
  return apiFetch<LocationStateDto>(
    `/locations/${encodeURIComponent(id)}/state`,
    { headers: { 'x-user-time': userTime } },
  )
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  })
}

export function useLocationState(id: string | undefined) {
  const timeOverride = useGameStore((s) => s.timeOverride)
  // Key by the override so flipping the time changer triggers a refetch.
  // When there's no override we use 'live' as the key and resolve the real
  // clock inside `queryFn` (otherwise we'd change the key on every render).
  return useQuery({
    queryKey: ['location-state', id, timeOverride ?? 'live'],
    enabled: Boolean(id),
    queryFn: () =>
      fetchLocationState(
        id as string,
        timeOverride ?? new Date().toISOString(),
      ),
  })
}
