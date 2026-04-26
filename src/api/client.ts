import { useGameStore } from '@/game/store'
import { getMessages } from '@/i18n'
import { toast } from '@/components/Toaster'
import type { components } from './openapi'

export type CharacterDto = components['schemas']['CharacterDto']
export type LocationDto = components['schemas']['LocationDto']
export type LocationStateDto = components['schemas']['LocationStateDto']
export type PlaceStateDto = components['schemas']['PlaceStateDto']
export type ChatDto = components['schemas']['ChatDto']
export type CreateChatDto = components['schemas']['CreateChatDto']
export type SendMessageDto = components['schemas']['SendMessageDto']
export type CreateAvatarDto = components['schemas']['CreateAvatarDto']
export type UpdateAvatarDto = components['schemas']['UpdateAvatarDto']
export type AvatarDto = components['schemas']['AvatarDto']
export type SystemChatDto = components['schemas']['SystemChatDto']
export type SystemMessageDto = components['schemas']['SystemMessageDto']
export type SendSystemMessageDto = components['schemas']['SendSystemMessageDto']
export type AuthTokenDto = components['schemas']['AuthTokenDto']
export type AuthUserDto = components['schemas']['AuthUserDto']
export type GoogleAuthDto = components['schemas']['GoogleAuthDto']
export type RefreshAuthDto = components['schemas']['RefreshAuthDto']
export type LogoutAuthDto = components['schemas']['LogoutAuthDto']

const STAGING_API = 'https://gpt-city-api-5950170b319a.herokuapp.com'

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? STAGING_API

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('Accept', 'application/json')
  // Tell the backend which locale the user is viewing the app in so it can
  // localize generated content. Callers can still override this by passing
  // `x-locale` explicitly.
  if (!headers.has('x-locale')) {
    headers.set('x-locale', useGameStore.getState().uiLanguage)
  }
  const response = await fetch(url, { ...init, headers })
  if (!response.ok) {
    let detail = ''
    try {
      detail = await response.text()
    } catch {
      // ignore body read errors
    }
    throw new ApiError(
      response.status,
      `${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
    )
  }
  if (response.status === 204) return undefined as T
  const ct = response.headers.get('Content-Type') ?? ''
  if (ct.includes('application/json')) {
    return (await response.json()) as T
  }
  return (await response.text()) as unknown as T
}

// Module-level state for the in-flight refresh promise. Concurrent 401s
// should share a single refresh round-trip and pick up the rotated token.
let refreshPromise: Promise<string> | null = null

export function getAuthHeader(): string | null {
  const token = useGameStore.getState().accessToken
  return token ? `Bearer ${token}` : null
}

// Calls POST /auth/refresh with the persisted refresh token, persists the
// rotated tokens on success, and clears the session on failure. Concurrent
// callers share a single in-flight request.
export async function refreshTokens(): Promise<string> {
  if (refreshPromise) return refreshPromise
  const rt = useGameStore.getState().refreshToken
  if (!rt) {
    throw new ApiError(401, 'Not authenticated')
  }
  refreshPromise = (async () => {
    try {
      const tokens = await apiFetch<AuthTokenDto>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: rt } satisfies RefreshAuthDto),
      })
      useGameStore.getState().setSession(tokens)
      return tokens.accessToken
    } catch (err) {
      const hadSession = useGameStore.getState().accessToken != null
      useGameStore.getState().clearSession()
      if (hadSession) {
        // Surface a translated message so the user understands why they were
        // bounced to the login screen.
        toast(getMessages().auth.sessionExpired, 'error')
      }
      throw err
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

// Authenticated wrapper around `apiFetch`. Adds an Authorization header,
// transparently retries once on 401 after refreshing the token, and forwards
// any other error untouched.
export async function apiFetchAuthed<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const accessToken = useGameStore.getState().accessToken
  // Bootstrap-time race: an in-flight refresh may already be writing tokens.
  // Wait for it before deciding.
  const token =
    accessToken ?? (refreshPromise ? await refreshPromise : null)
  if (!token) {
    throw new ApiError(401, 'Not authenticated')
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)

  try {
    return await apiFetch<T>(path, { ...init, headers })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      try {
        const newToken = await refreshTokens()
        const retryHeaders = new Headers(init.headers)
        retryHeaders.set('Authorization', `Bearer ${newToken}`)
        return await apiFetch<T>(path, { ...init, headers: retryHeaders })
      } catch {
        // Re-throw the original 401 so callers see a consistent error shape.
        throw err
      }
    }
    throw err
  }
}
