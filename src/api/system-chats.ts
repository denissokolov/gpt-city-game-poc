import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetchAuthed, type SystemChatDto, type SystemMessageDto } from './client'
import { toastError } from '@/components/Toaster'
import { useGameStore } from '@/game/store'

export function fetchSystemMessages(id: string) {
  return apiFetchAuthed<SystemMessageDto[]>(
    `/system-chats/${encodeURIComponent(id)}/messages`,
  )
}

export function listSystemChats() {
  return apiFetchAuthed<SystemChatDto[]>('/system-chats')
}

export function createSystemChat(avatarId: string) {
  return apiFetchAuthed<SystemChatDto>('/system-chats', {
    method: 'POST',
    headers: { 'x-avatar-id': avatarId },
  })
}

export function deleteSystemChat(id: string) {
  return apiFetchAuthed<void>(`/system-chats/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function useSystemMessages(
  chatId: string | null | undefined,
  avatarId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['system-messages', chatId],
    enabled: Boolean(chatId && avatarId),
    queryFn: () => fetchSystemMessages(chatId as string),
  })
}

export function useSystemChats(avatarId: string | null | undefined) {
  return useQuery({
    queryKey: ['system-chats', avatarId],
    enabled: Boolean(avatarId),
    queryFn: () => listSystemChats(),
  })
}

export function useDeleteSystemChat(avatarId: string) {
  const queryClient = useQueryClient()
  const forgetSystemChatId = useGameStore((s) => s.forgetSystemChatId)
  const activeSystemChatId = useGameStore((s) => s.systemChatId)
  return useMutation({
    mutationFn: (id: string) => deleteSystemChat(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({
        queryKey: ['system-chats', avatarId],
      })
      queryClient.removeQueries({ queryKey: ['system-messages', id] })
      if (activeSystemChatId === id) forgetSystemChatId()
    },
    onError: (err) => toastError(err),
  })
}
