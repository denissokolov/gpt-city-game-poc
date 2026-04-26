import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  createSystemChat,
  useDeleteSystemChat,
  useSystemChats,
} from '@/api/system-chats'
import type { SystemChatDto } from '@/api/client'
import { useGameStore } from '@/game/store'
import { toastError } from '@/components/Toaster'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

interface SystemChatHistoryListProps {
  avatarId: string
  currentChatId: string | null
  onSelect: (id: string) => void
  onCreated: (id: string) => void
}

function chatTitle(chat: SystemChatDto): string | null {
  // The OpenAPI schema types `title` as `Record<string, never> | null`,
  // but the description and example say it's a string. Coerce defensively.
  const raw = chat.title as unknown
  return typeof raw === 'string' && raw.length > 0 ? raw : null
}

export default function SystemChatHistoryList({
  avatarId,
  currentChatId,
  onSelect,
  onCreated,
}: SystemChatHistoryListProps) {
  const t = useT()
  const uiLanguage = useGameStore((s) => s.uiLanguage)
  const queryClient = useQueryClient()
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const chatsQuery = useSystemChats(avatarId)

  const createMutation = useMutation({
    mutationFn: (id: string) => createSystemChat(id),
    onSuccess: (chat) => {
      void queryClient.invalidateQueries({
        queryKey: ['system-chats', avatarId],
      })
      onCreated(chat.id)
    },
    onError: (err) => toastError(err),
  })

  const deleteMutation = useDeleteSystemChat(avatarId)
  const isDeleting = deleteMutation.isPending

  const sortedChats = useMemo(() => {
    const list = chatsQuery.data ?? []
    return [...list].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
  }, [chatsQuery.data])

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(uiLanguage, {
        month: 'short',
        day: 'numeric',
      }),
    [uiLanguage],
  )

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3">
      <ul className="flex flex-col gap-1.5">
        <li>
          <button
            type="button"
            onClick={() => {
              if (createMutation.isPending) return
              createMutation.mutate(avatarId)
            }}
            disabled={createMutation.isPending}
            className="flex w-full items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-2.5 text-sm font-medium text-city-ink transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon className="h-4 w-4 text-city-accent" />
            <span>{t.systemChat.newChat}</span>
          </button>
        </li>

        {chatsQuery.isLoading && (
          <li className="px-3 py-4 text-center text-sm text-city-muted">
            <TypingDots label={t.systemChat.typing} />
          </li>
        )}

        {chatsQuery.isError && (
          <li className="px-3 py-4 text-center text-sm text-red-300/90">
            {t.common.somethingWentWrong}
          </li>
        )}

        {chatsQuery.isSuccess && sortedChats.length === 0 && (
          <li className="px-3 py-4 text-center text-sm text-city-muted">
            {t.systemChat.historyEmpty}
          </li>
        )}

        {sortedChats.map((chat) => {
          const isCurrent = chat.id === currentChatId
          const title = chatTitle(chat) ?? t.systemChat.untitledChat
          const date = dateFormatter.format(new Date(chat.updatedAt))
          const isPending = pendingDeleteId === chat.id
          const isDeletingThis = isDeleting && isPending
          return (
            <motion.li
              key={chat.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'flex items-stretch gap-1.5 rounded-xl border transition-colors',
                isCurrent
                  ? 'border-city-accent/40 bg-city-accent/10'
                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
                isPending && 'border-red-400/40 bg-red-500/5 hover:bg-red-500/5',
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(chat.id)}
                disabled={isPending}
                className={cn(
                  'flex min-w-0 flex-1 items-center gap-3 rounded-l-xl px-3 py-2.5 text-left text-sm text-city-ink transition-colors',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                )}
                aria-current={isCurrent ? 'true' : undefined}
              >
                <span className="min-w-0 flex-1 truncate">{title}</span>
                <span className="shrink-0 text-xs text-city-muted">{date}</span>
              </button>
              {isPending ? (
                <div className="flex items-center gap-1 pr-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (isDeletingThis) return
                      deleteMutation.mutate(chat.id, {
                        onSettled: () => setPendingDeleteId(null),
                      })
                    }}
                    disabled={isDeletingThis}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t.systemChat.deleteConfirm}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(null)}
                    disabled={isDeletingThis}
                    className="rounded-lg px-2 py-1 text-xs text-city-muted transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t.systemChat.deleteCancel}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(chat.id)}
                  disabled={isDeleting}
                  aria-label={t.systemChat.deleteAriaLabel}
                  className="flex shrink-0 items-center justify-center rounded-r-xl px-2.5 text-city-muted transition-colors hover:bg-white/[0.06] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}

function TypingDots({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 py-1"
      role="status"
      aria-label={label}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-city-muted animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-city-muted animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-city-muted animate-bounce" />
    </span>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}
