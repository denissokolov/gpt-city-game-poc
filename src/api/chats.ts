import { apiFetchAuthed, type ChatDto, type CreateChatDto } from './client'

export function createChat(body: CreateChatDto, avatarId: string) {
  return apiFetchAuthed<ChatDto>('/chats', {
    method: 'POST',
    headers: { 'x-avatar-id': avatarId },
    body: JSON.stringify(body),
  })
}
