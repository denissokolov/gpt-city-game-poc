import { apiFetch, type ChatDto, type CreateChatDto } from './client'

export function createChat(body: CreateChatDto, avatarId: string) {
  return apiFetch<ChatDto>('/chats', {
    method: 'POST',
    headers: { 'x-avatar-id': avatarId },
    body: JSON.stringify(body),
  })
}
