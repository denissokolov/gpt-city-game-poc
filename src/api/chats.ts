import { apiFetch, type ChatDto, type CreateChatDto } from './client'

export function createChat(body: CreateChatDto) {
  return apiFetch<ChatDto>('/chats', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
