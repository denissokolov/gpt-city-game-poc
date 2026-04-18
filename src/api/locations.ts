import { useQuery } from '@tanstack/react-query'
import {
  apiFetch,
  type LocationDto,
  type LocationSummaryDto,
} from './client'

export function fetchLocations() {
  return apiFetch<LocationSummaryDto[]>('/locations')
}

export function fetchLocation(id: string) {
  return apiFetch<LocationDto>(`/locations/${encodeURIComponent(id)}`)
}

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  })
}

export function useLocation(id: string | undefined) {
  return useQuery({
    queryKey: ['location', id],
    enabled: Boolean(id),
    queryFn: () => fetchLocation(id as string),
  })
}
