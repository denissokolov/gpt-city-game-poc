import { useQuery } from '@tanstack/react-query'
import { apiFetch, type SystemChatDto, type SystemMessageDto } from './client'

export function fetchSystemMessages(id: string, userId: string) {
  return apiFetch<SystemMessageDto[]>(
    `/system-chats/${encodeURIComponent(id)}/messages`,
    { headers: { 'x-user-id': userId } },
  )
}

export function listSystemChats(userId: string) {
  return apiFetch<SystemChatDto[]>('/system-chats', {
    headers: { 'x-user-id': userId },
  })
}

export function createSystemChat(userId: string) {
  return apiFetch<SystemChatDto>('/system-chats', {
    method: 'POST',
    headers: { 'x-user-id': userId },
  })
}

export function useSystemMessages(
  chatId: string | null | undefined,
  userId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['system-messages', chatId],
    enabled: Boolean(chatId && userId),
    queryFn: () => fetchSystemMessages(chatId as string, userId as string),
  })
}

export function useSystemChats(userId: string | null | undefined) {
  return useQuery({
    queryKey: ['system-chats', userId],
    enabled: Boolean(userId),
    queryFn: () => listSystemChats(userId as string),
  })
}
