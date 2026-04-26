import { apiFetchAuthed, type ChatDto, type CreateChatDto } from './client'

/** Coerces `ChatDto.silenceIdleMs` (OpenAPI may type it loosely) for client use. */
export function coerceChatSilenceIdleMs(raw: unknown): number | undefined {
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw <= 0) return undefined
  return Math.floor(raw)
}

export function createChat(body: CreateChatDto, avatarId: string) {
  return apiFetchAuthed<ChatDto>('/chats', {
    method: 'POST',
    headers: { 'x-avatar-id': avatarId },
    body: JSON.stringify(body),
  })
}
