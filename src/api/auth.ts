import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  apiFetch,
  apiFetchAuthed,
  refreshTokens as refreshTokensRequest,
  type AuthTokenDto,
  type AuthUserDto,
  type AvatarDto,
  type GoogleAuthDto,
  type LogoutAuthDto,
} from './client'
import { useGameStore } from '@/game/store'

export const ME_QUERY_KEY = ['auth', 'me'] as const
export const MY_AVATARS_QUERY_KEY = ['avatars', 'mine'] as const

export function googleAuth(idToken: string) {
  return apiFetch<AuthTokenDto>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ idToken } satisfies GoogleAuthDto),
  })
}

export function logoutAuth(refreshToken: string | null) {
  const body: LogoutAuthDto = refreshToken ? { refreshToken } : {}
  return apiFetch<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function getMe() {
  return apiFetchAuthed<AuthUserDto>('/auth/me')
}

export function listMyAvatars() {
  return apiFetchAuthed<AvatarDto[]>('/avatars')
}

export function useMe() {
  const accessToken = useGameStore((s) => s.accessToken)
  const setAuthUser = useGameStore((s) => s.setAuthUser)

  const query = useQuery({
    queryKey: ME_QUERY_KEY,
    enabled: Boolean(accessToken),
    queryFn: getMe,
  })

  useEffect(() => {
    if (query.data) setAuthUser(query.data)
  }, [query.data, setAuthUser])

  return query
}

export function useMyAvatars() {
  const accessToken = useGameStore((s) => s.accessToken)
  return useQuery({
    queryKey: MY_AVATARS_QUERY_KEY,
    enabled: Boolean(accessToken),
    queryFn: listMyAvatars,
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const refreshToken = useGameStore((s) => s.refreshToken)
  const clearSession = useGameStore((s) => s.clearSession)
  return useMutation({
    mutationFn: () =>
      logoutAuth(refreshToken).catch(() => undefined),
    onSettled: () => {
      clearSession()
      queryClient.clear()
    },
  })
}

// Keeps the access token fresh while the app is running. Schedules a single
// timer that fires `REFRESH_BUFFER_MS` before the access JWT expires. We
// ignore failures here — `refreshTokens` already clears the session and
// surfaces a toast on hard failure, which causes `RequireAuth` to redirect.
const REFRESH_BUFFER_MS = 60_000
const MAX_TIMEOUT_MS = 24 * 60 * 60 * 1000

export function useAutoRefreshTokens() {
  const accessTokenExpiresAt = useGameStore((s) => s.accessTokenExpiresAt)
  const refreshToken = useGameStore((s) => s.refreshToken)

  useEffect(() => {
    if (!accessTokenExpiresAt || !refreshToken) return
    const expiresAtMs = accessTokenExpiresAt * 1000
    const delay = Math.min(
      MAX_TIMEOUT_MS,
      Math.max(0, expiresAtMs - Date.now() - REFRESH_BUFFER_MS),
    )
    const timer = window.setTimeout(() => {
      void refreshTokensRequest().catch(() => {
        // already handled inside refreshTokensRequest
      })
    }, delay)
    return () => window.clearTimeout(timer)
  }, [accessTokenExpiresAt, refreshToken])
}
