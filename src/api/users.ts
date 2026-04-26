import { useQuery } from '@tanstack/react-query'
import {
  apiFetch,
  type CreateUserDto,
  type UpdateUserDto,
  type UserDto,
} from './client'
import { useGameStore } from '@/game/store'

export function createUser(body: CreateUserDto) {
  return apiFetch<UserDto>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateUser(id: string, body: UpdateUserDto) {
  return apiFetch<UserDto>(`/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function getCurrentUser(userId: string) {
  return apiFetch<UserDto>('/users/current', {
    headers: { 'x-user-id': userId },
  })
}

// Fetches the persisted user's profile from the backend. Profile data is no
// longer mirrored in localStorage — only the user id is — so consumers that
// need the name / title / etc. read it from the server via this hook.
export function useCurrentUser() {
  const userId = useGameStore((s) => s.userId)
  return useQuery({
    queryKey: ['current-user', userId],
    enabled: Boolean(userId),
    queryFn: () => getCurrentUser(userId as string),
  })
}
