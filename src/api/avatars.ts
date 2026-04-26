import { useQuery } from '@tanstack/react-query'
import {
  apiFetch,
  type AvatarDto,
  type CreateAvatarDto,
  type UpdateAvatarDto,
} from './client'
import { useGameStore } from '@/game/store'

export function createAvatar(body: CreateAvatarDto) {
  return apiFetch<AvatarDto>('/avatars', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateAvatar(id: string, body: UpdateAvatarDto) {
  return apiFetch<AvatarDto>(`/avatars/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function getCurrentAvatar(avatarId: string) {
  return apiFetch<AvatarDto>('/avatars/current', {
    headers: { 'x-avatar-id': avatarId },
  })
}

// Fetches the persisted avatar's profile from the backend. Profile data is no
// longer mirrored in localStorage — only the avatar id is — so consumers that
// need the name / title / etc. read it from the server via this hook.
export function useCurrentAvatar() {
  const avatarId = useGameStore((s) => s.avatarId)
  return useQuery({
    queryKey: ['current-avatar', avatarId],
    enabled: Boolean(avatarId),
    queryFn: () => getCurrentAvatar(avatarId as string),
  })
}
