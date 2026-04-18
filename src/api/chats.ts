import { apiFetch, type ChatDto, type CreateChatDto } from './client'

export function createChat(body: CreateChatDto, userId: string) {
  return apiFetch<ChatDto>('/chats', {
    method: 'POST',
    headers: { 'x-user-id': userId },
    body: JSON.stringify(body),
  })
}
