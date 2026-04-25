import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import {
  API_BASE_URL,
  type SystemMessageDto,
} from '@/api/client'
import {
  createSystemChat,
  useSystemMessages,
} from '@/api/system-chats'
import { useGameStore } from '@/game/store'
import { avatarUrl } from '@/game/avatars'
import { toastError } from '@/components/Toaster'
import {
  StreamingCaret,
  useStreamReveal,
} from '@/components/StreamingText'
import Markdown from '@/components/Markdown'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

function partsToText(msg: UIMessage): string {
  return msg.parts
    .filter(
      (p): p is { type: 'text'; text: string; state?: 'streaming' | 'done' } =>
        p.type === 'text',
    )
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

function AssistantMarkdown({
  text,
  streaming,
}: {
  text: string
  streaming: boolean
}) {
  const { displayed, isRevealing } = useStreamReveal(text, { streaming })
  return (
    <>
      <Markdown text={displayed} />
      {isRevealing && <StreamingCaret />}
    </>
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
  const player = useGameStore((s) => s.player)
  const systemChatId = useGameStore((s) => s.systemChatId)
  const setSystemChatId = useGameStore((s) => s.setSystemChatId)
  const forgetSystemChatId = useGameStore((s) => s.forgetSystemChatId)

  const userId = player?.id ?? null

  const ensureMutation = useMutation({
    mutationFn: (uid: string) => createSystemChat(uid),
    onSuccess: (chat) => setSystemChatId(chat.id),
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

  const isReady = Boolean(
    userId && systemChatId && messagesQuery.isSuccess,
  )

  const initialMessages = useMemo<UIMessage[]>(
    () => (messagesQuery.data ?? []).map(dtoToUIMessage),
    [messagesQuery.data],
  )

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-city-accent/15 text-city-accent">
          <SparklesIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display font-semibold leading-tight">
            {t.systemChat.title}
          </p>
          <p className="truncate text-xs text-city-muted">
            {t.systemChat.subtitle}
          </p>
        </div>
        <button
          type="button"
          className="btn-ghost ml-auto text-xs"
          onClick={() => {
            if (systemChatId) forgetSystemChatId()
            lastAttemptedFor.current = null
          }}
          title={t.systemChat.newConversation}
        >
          {t.systemChat.newConversation}
        </button>
        <button
          type="button"
          className="btn-ghost shrink-0"
          aria-label={t.systemChat.close}
          onClick={onClose}
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>

      {isReady && systemChatId && userId ? (
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
            <span className="text-red-300/90">
              {t.common.somethingWentWrong}
            </span>
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
  const player = useGameStore((s) => s.player)
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
              const text = partsToText(m)
              const isUser = m.role === 'user'
              const isLast = i === messages.length - 1
              const isStreamingThis = !isUser && isLast && isStreaming
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex items-start gap-2',
                    isUser ? 'justify-end' : 'justify-start',
                  )}
                >
                  {!isUser && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-city-accent/15 text-city-accent">
                      <SparklesIcon className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm break-words',
                      isUser
                        ? 'bg-city-accent text-slate-900 rounded-tr-sm whitespace-pre-wrap'
                        : 'bg-white/[0.06] border border-white/10 text-city-ink rounded-tl-sm',
                    )}
                  >
                    {isUser ? (
                      text
                    ) : text ? (
                      <AssistantMarkdown
                        text={text}
                        streaming={isStreamingThis}
                      />
                    ) : (
                      <TypingDots label={t.systemChat.typing} />
                    )}
                  </div>
                  {isUser && player && (
                    <img
                      src={avatarUrl(player.avatarStyle, player.avatarSeed, 64)}
                      alt=""
                      className="h-7 w-7 rounded-full border border-white/10 shrink-0"
                    />
                  )}
                </motion.div>
              )
            })}
            {isStreaming &&
              (messages.length === 0 ||
                messages[messages.length - 1].role === 'user') && (
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

          {error && (
            <div className="text-center text-sm text-red-300/90">
              {error.message}
            </div>
          )}
        </div>
      </main>

      <form
        onSubmit={handleSubmit}
        className="border-t border-white/5 bg-city-bg/80 px-3 py-2.5 backdrop-blur-md"
      >
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
