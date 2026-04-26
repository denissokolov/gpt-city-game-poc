import { useGameStore } from '@/game/store'
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
