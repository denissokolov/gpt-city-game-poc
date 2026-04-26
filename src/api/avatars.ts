import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  apiFetchAuthed,
  ApiError,
  type AvatarDto,
  type CreateAvatarDto,
  type UpdateAvatarDto,
} from './client'
import { useGameStore } from '@/game/store'

export function createAvatar(body: CreateAvatarDto) {
  return apiFetchAuthed<AvatarDto>('/avatars', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function updateAvatar(id: string, body: UpdateAvatarDto) {
  return apiFetchAuthed<AvatarDto>(`/avatars/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function getCurrentAvatar(avatarId: string) {
  return apiFetchAuthed<AvatarDto>('/avatars/current', {
    headers: { 'x-avatar-id': avatarId },
  })
}

function isGoneError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 403)
}

// Fetches the persisted avatar's profile from the backend. Profile data is no
// longer mirrored in localStorage — only the avatar id is — so consumers that
// need the name / title / etc. read it from the server via this hook.
//
// If the server returns 404/403 (avatar deleted or inaccessible), the local
// active avatar is cleared so the user is redirected to the avatar picker /
// onboarding.
export function useCurrentAvatar() {
  const avatarId = useGameStore((s) => s.avatarId)
  const accessToken = useGameStore((s) => s.accessToken)
  const clearActiveAvatar = useGameStore((s) => s.clearActiveAvatar)

  const query = useQuery({
    queryKey: ['current-avatar', avatarId],
    enabled: Boolean(avatarId && accessToken),
    queryFn: () => getCurrentAvatar(avatarId as string),
    retry: (failureCount, err) => !isGoneError(err) && failureCount < 3,
  })

  useEffect(() => {
    if (isGoneError(query.error)) clearActiveAvatar()
  }, [query.error, clearActiveAvatar])

  return query
}
