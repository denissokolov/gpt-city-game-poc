import { useQuery } from '@tanstack/react-query'
import {
  apiFetch,
  type LocationDto,
  type LocationStateDto,
} from './client'

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
  return useQuery({
    queryKey: ['location-state', id],
    enabled: Boolean(id),
    queryFn: () => fetchLocationState(id as string, new Date().toISOString()),
  })
}
