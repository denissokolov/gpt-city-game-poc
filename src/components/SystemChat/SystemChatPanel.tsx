import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { API_BASE_URL, type SystemMessageDto } from '@/api/client'
import { createSystemChat, useSystemMessages } from '@/api/system-chats'
import { useGameStore } from '@/game/store'
import { avatarUrl } from '@/game/avatars'
import { toastError } from '@/components/Toaster'
import { StreamingCaret, useStreamReveal } from '@/components/StreamingText'
import Markdown from '@/components/Markdown'
import ToolInvocation, { isAnyToolPart } from '@/components/SystemChat/ToolInvocation'
import SystemChatHistoryList from '@/components/SystemChat/SystemChatHistoryList'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

type TextPart = { type: 'text'; text: string; state?: 'streaming' | 'done' }

function isTextPart(p: UIMessage['parts'][number]): p is TextPart {
  return p.type === 'text'
}

function partsToText(msg: UIMessage): string {
  return msg.parts
    .filter(isTextPart)
    .map((p) => p.text)
    .join('')
}

function dtoToUIMessage(m: SystemMessageDto): UIMessage {
  return {
    id: m.id,
    role: m.role === 'assistant' ? 'assistant' : 'user',
    parts: [{ type: 'text', text: m.content }],
  }
}

function AssistantMarkdown({ text, streaming }: { text: string; streaming: boolean }) {
  const { displayed, isRevealing } = useStreamReveal(text, { streaming })
  return (
    <>
      <Markdown text={displayed} />
      {isRevealing && <StreamingCaret />}
    </>
  )
}

function AssistantMessage({
  message,
  streamingThis,
}: {
  message: UIMessage
  streamingThis: boolean
}) {
  const t = useT()
  const renderable = message.parts.filter((p) => isTextPart(p) || isAnyToolPart(p))

  if (renderable.length === 0) {
    return (
      <div className="max-w-[80%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3.5 py-2 text-sm text-city-ink">
        <TypingDots label={t.systemChat.typing} />
      </div>
    )
  }

  // Find the index of the last text part so only it streams.
  let lastTextIdx = -1
  for (let i = renderable.length - 1; i >= 0; i -= 1) {
    if (isTextPart(renderable[i])) {
      lastTextIdx = i
      break
    }
  }

  return (
    <div className="flex max-w-[80%] flex-col items-stretch gap-2">
      {renderable.map((part, idx) => {
        if (isTextPart(part)) {
          if (!part.text) return null
          const isStreamingPart =
            streamingThis &&
            idx === lastTextIdx &&
            (part.state === 'streaming' || part.state == null)
          return (
            <div
              key={`text-${idx}`}
              className="self-start rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-3.5 py-2 text-sm break-words text-city-ink"
            >
              <AssistantMarkdown text={part.text} streaming={isStreamingPart} />
            </div>
          )
        }
        if (isAnyToolPart(part)) {
          return <ToolInvocation key={part.toolCallId ?? `tool-${idx}`} part={part} />
        }
        return null
      })}
    </div>
  )
}

function TypingDots({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 py-1" role="status" aria-label={label}>
      <span className="h-1.5 w-1.5 rounded-full bg-city-muted animate-bounce [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-city-muted animate-bounce [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 rounded-full bg-city-muted animate-bounce" />
    </span>
  )
}

function isStaleChatError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    /\b(403|404)\b/.test(msg) ||
    /not the owner/i.test(msg) ||
    /forbidden/i.test(msg) ||
    /not ?found/i.test(msg)
  )
}

interface SystemChatPanelProps {
  onClose: () => void
}

export default function SystemChatPanel({ onClose }: SystemChatPanelProps) {
  const t = useT()
  const userId = useGameStore((s) => s.userId)
  const systemChatId = useGameStore((s) => s.systemChatId)
  const setSystemChatId = useGameStore((s) => s.setSystemChatId)
  const forgetSystemChatId = useGameStore((s) => s.forgetSystemChatId)

  const [view, setView] = useState<'chat' | 'history'>('chat')

  const queryClient = useQueryClient()

  const ensureMutation = useMutation({
    mutationFn: (uid: string) => createSystemChat(uid),
    onSuccess: (chat) => setSystemChatId(chat.id),
    onError: (err) => toastError(err),
  })

  const newChatMutation = useMutation({
    mutationFn: (uid: string) => createSystemChat(uid),
    onSuccess: (chat) => {
      void queryClient.invalidateQueries({
        queryKey: ['system-chats', userId],
      })
      setSystemChatId(chat.id)
      setView('chat')
    },
    onError: (err) => toastError(err),
  })

  // Eagerly create a system chat on first open so we can show any prior
  // history immediately. We guard against repeated calls by tracking the
  // userId we last attempted for.
  const lastAttemptedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!userId) return
    if (systemChatId) {
      lastAttemptedFor.current = userId
      return
    }
    if (lastAttemptedFor.current === userId) return
    if (ensureMutation.isPending) return
    lastAttemptedFor.current = userId
    ensureMutation.mutate(userId)
  }, [userId, systemChatId, ensureMutation])

  const messagesQuery = useSystemMessages(systemChatId, userId)

  const isReady = Boolean(userId && systemChatId && messagesQuery.isSuccess)

  const initialMessages = useMemo<UIMessage[]>(
    () => (messagesQuery.data ?? []).map(dtoToUIMessage),
    [messagesQuery.data],
  )

  const inHistory = view === 'history'
  const historyButtonLabel = inHistory ? t.systemChat.back : t.systemChat.history

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-city-accent/15 text-city-accent">
          <SparklesIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold leading-tight">{t.systemChat.title}</p>
          <p className="truncate text-xs text-city-muted">{t.systemChat.subtitle}</p>
        </div>
        {userId && (
          <>
            <button
              type="button"
              className="btn-ghost ml-auto inline-flex h-9 w-9 shrink-0 items-center justify-center !p-0"
              onClick={() => {
                if (newChatMutation.isPending) return
                newChatMutation.mutate(userId)
              }}
              disabled={newChatMutation.isPending}
              aria-label={t.systemChat.newChat}
              title={t.systemChat.newChat}
            >
              <PlusIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="btn-ghost inline-flex h-9 w-9 shrink-0 items-center justify-center !p-0"
              onClick={() => setView((v) => (v === 'history' ? 'chat' : 'history'))}
              aria-label={historyButtonLabel}
              aria-pressed={inHistory}
              title={historyButtonLabel}
            >
              {inHistory ? (
                <ArrowLeftIcon className="h-4 w-4" />
              ) : (
                <HistoryIcon className="h-4 w-4" />
              )}
            </button>
          </>
        )}
        <button
          type="button"
          className={cn(
            'btn-ghost inline-flex h-9 w-9 shrink-0 items-center justify-center !p-0',
            !userId && 'ml-auto',
          )}
          aria-label={t.systemChat.close}
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      {inHistory && userId ? (
        <SystemChatHistoryList
          userId={userId}
          currentChatId={systemChatId}
          onSelect={(id) => {
            setSystemChatId(id)
            setView('chat')
          }}
          onCreated={(id) => {
            setSystemChatId(id)
            setView('chat')
          }}
        />
      ) : isReady && systemChatId && userId ? (
        <SystemChatConversation
          key={systemChatId}
          chatId={systemChatId}
          userId={userId}
          initialMessages={initialMessages}
          onStaleChat={() => {
            forgetSystemChatId()
            lastAttemptedFor.current = null
          }}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center px-4 py-6 text-sm text-city-muted">
          {messagesQuery.isError || ensureMutation.isError ? (
            <span className="text-red-300/90">{t.common.somethingWentWrong}</span>
          ) : (
            <TypingDots label={t.systemChat.typing} />
          )}
        </div>
      )}
    </div>
  )
}

interface SystemChatConversationProps {
  chatId: string
  userId: string
  initialMessages: UIMessage[]
  onStaleChat: () => void
}

function SystemChatConversation({
  chatId,
  userId,
  initialMessages,
  onStaleChat,
}: SystemChatConversationProps) {
  const t = useT()
  const avatarStyle = useGameStore((s) => s.avatarStyle)
  const avatarSeed = useGameStore((s) => s.avatarSeed)
  const uiLanguage = useGameStore((s) => s.uiLanguage)
  const queryClient = useQueryClient()

  const transport = useMemo(
    () =>
      new DefaultChatTransport<UIMessage>({
        api: `${API_BASE_URL}/system-chats/${encodeURIComponent(chatId)}/messages`,
        headers: { 'x-user-id': userId, 'x-locale': uiLanguage },
        prepareSendMessagesRequest: ({ messages }) => {
          const last = messages[messages.length - 1]
          const message = last ? partsToText(last) : ''
          return { body: { message } }
        },
      }),
    [chatId, userId, uiLanguage],
  )

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport,
    messages: initialMessages,
    onFinish: () => {
      // The assistant has tools that mutate game state (characters,
      // locations, places). We can't tell from the stream whether it ran
      // any of them, so refresh the relevant caches conservatively.
      void queryClient.invalidateQueries({ queryKey: ['characters'] })
      void queryClient.invalidateQueries({ queryKey: ['locations'] })
      void queryClient.invalidateQueries({ queryKey: ['location-state'] })
      void queryClient.invalidateQueries({
        queryKey: ['system-messages', chatId],
      })
      // The chat title is auto-generated from the first user message, so
      // refresh the list to pick up new titles and updatedAt order.
      void queryClient.invalidateQueries({ queryKey: ['system-chats', userId] })
      // The assistant can run the update-user tool to modify the player's
      // profile, so keep the current-user cache in sync after every turn.
      void queryClient.invalidateQueries({ queryKey: ['current-user'] })
    },
    onError: (err) => {
      if (isStaleChatError(err)) {
        toastError(t.systemChat.staleConversation)
        onStaleChat()
        return
      }
      toastError(err)
    },
  })

  const [input, setInput] = useState('')
  const scrollerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const scroller = scrollerRef.current
    const content = contentRef.current
    if (!scroller || !content) return
    const observer = new ResizeObserver(() => {
      scroller.scrollTop = scroller.scrollHeight
    })
    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [input])

  const isStreaming = status === 'streaming' || status === 'submitted'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    void sendMessage({ text })
  }

  return (
    <>
      <main ref={scrollerRef} className="flex-1 overflow-y-auto">
        <div ref={contentRef} className="space-y-3 px-4 py-4">
          {messages.length === 0 && !isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-4 text-center"
            >
              <p className="text-sm text-city-muted">{t.systemChat.empty}</p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => {
              const isUser = m.role === 'user'
              const isLast = i === messages.length - 1
              const isStreamingThis = !isUser && isLast && isStreaming
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex items-start gap-2', isUser ? 'justify-end' : 'justify-start')}
                >
                  {!isUser && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-city-accent/15 text-city-accent">
                      <SparklesIcon className="h-4 w-4" />
                    </div>
                  )}
                  {isUser ? (
                    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-city-accent px-3.5 py-2 text-sm whitespace-pre-wrap break-words text-slate-900">
                      {partsToText(m)}
                    </div>
                  ) : (
                    <AssistantMessage message={m} streamingThis={isStreamingThis} />
                  )}
                  {isUser && avatarStyle && avatarSeed && (
                    <img
                      src={avatarUrl(avatarStyle, avatarSeed, 64)}
                      alt=""
                      className="h-7 w-7 rounded-full border border-white/10 shrink-0"
                    />
                  )}
                </motion.div>
              )
            })}
            {isStreaming &&
              (messages.length === 0 || messages[messages.length - 1].role === 'user') && (
                <motion.div
                  key="__typing__"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 justify-start"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-city-accent/15 text-city-accent">
                    <SparklesIcon className="h-4 w-4" />
                  </div>
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-3.5 py-2 text-sm bg-white/[0.06] border border-white/10 text-city-ink">
                    <TypingDots label={t.systemChat.typing} />
                  </div>
                </motion.div>
              )}
          </AnimatePresence>

          {error && <div className="text-center text-sm text-red-300/90">{error.message}</div>}
        </div>
      </main>

      <form
        onSubmit={handleSubmit}
        className="border-t border-white/5 bg-city-bg/80 px-3 py-2.5 backdrop-blur-md"
      >
        <div className="mb-2">
          <button
            type="button"
            className="btn-ghost rounded-full px-3 py-1 text-xs"
            disabled={isStreaming}
            onClick={() => {
              void sendMessage({ text: t.systemChat.helpMessage })
            }}
          >
            {t.systemChat.helpButton}
          </button>
        </div>
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
            rows={1}
            placeholder={t.systemChat.placeholder}
            className="input resize-none overflow-y-auto max-h-32 leading-relaxed py-2"
          />
          <button
            type="submit"
            className="btn-primary py-3"
            disabled={!input.trim() || isStreaming}
            aria-label={t.common.send}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ position: 'relative', top: '1px', left: '-1px' }}
            >
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4Z" />
            </svg>
          </button>
        </div>
      </form>
    </>
  )
}

function SparklesIcon({ className }: { className?: string }) {
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
      <path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7Z" />
      <path d="M5 17l.8 2 2 .8-2 .8L5 22.8 4.2 20.6 2.2 19.8l2-.8Z" />
      <path d="M19 13l.6 1.5L21 15l-1.4.5-.6 1.5-.6-1.5L17 15l1.4-.5Z" />
    </svg>
  )
}

function HistoryIcon({ className }: { className?: string }) {
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
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l3 2" />
    </svg>
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

function ArrowLeftIcon({ className }: { className?: string }) {
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
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  )
}
