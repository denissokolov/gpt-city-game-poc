import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, type SystemChatDto, type SystemMessageDto } from './client'
import { toastError } from '@/components/Toaster'
import { useGameStore } from '@/game/store'

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

export function deleteSystemChat(id: string, userId: string) {
  return apiFetch<void>(`/system-chats/${encodeURIComponent(id)}`, {
    method: 'DELETE',
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

export function useDeleteSystemChat(userId: string) {
  const queryClient = useQueryClient()
  const forgetSystemChatId = useGameStore((s) => s.forgetSystemChatId)
  const activeSystemChatId = useGameStore((s) => s.systemChatId)
  return useMutation({
    mutationFn: (id: string) => deleteSystemChat(id, userId),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['system-chats', userId] })
      queryClient.removeQueries({ queryKey: ['system-messages', id] })
      if (activeSystemChatId === id) forgetSystemChatId()
    },
    onError: (err) => toastError(err),
  })
}
