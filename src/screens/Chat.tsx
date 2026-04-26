import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocationState } from '@/api/locations'
import { useCharacters } from '@/api/characters'
import { useCurrentAvatar } from '@/api/avatars'
import { API_BASE_URL, type CharacterDto } from '@/api/client'
import { useGameStore, type PlayerSex } from '@/game/store'
import { avatarUrl, npcAvatarUrl } from '@/game/avatars'
import { toastError } from '@/components/Toaster'
import StreamingText from '@/components/StreamingText'
import { useT, type Messages } from '@/i18n'
import { cn } from '@/lib/cn'

const SILENCE_IDLE_MS = 30_000

function partsToText(msg: UIMessage): string {
  return msg.parts
    .filter(
      (p): p is { type: 'text'; text: string; state?: 'streaming' | 'done' } => p.type === 'text',
    )
    .map((p) => p.text)
    .join('')
}

// The OpenAPI schema types `systemInstructions` as `Record<string, never> | null`,
// but the description and example say it's a string. Coerce defensively.
function characterSystemInstructions(character: CharacterDto): string | null {
  const raw = character.systemInstructions as unknown
  return typeof raw === 'string' && raw.trim().length > 0 ? raw : null
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

export default function ChatScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { chatId } = useParams<{ chatId: string }>()
  const [searchParams] = useSearchParams()
  const placeId = searchParams.get('placeId') ?? undefined
  const characterId = searchParams.get('characterId') ?? undefined

  const avatarId = useGameStore((s) => s.avatarId)
  const avatarStyle = useGameStore((s) => s.avatarStyle)
  const avatarSeed = useGameStore((s) => s.avatarSeed)
  const accessToken = useGameStore((s) => s.accessToken)
  const currentLocationId = useGameStore((s) => s.currentLocationId)
  const uiLanguage = useGameStore((s) => s.uiLanguage)

  const { data: player } = useCurrentAvatar()
  const { data: location } = useLocationState(currentLocationId ?? undefined)
  const { data: allCharacters } = useCharacters()

  const place = useMemo(() => {
    if (!placeId || !location) return undefined
    return location.places.find((p) => p.id === placeId)
  }, [placeId, location])

  const character = useMemo(() => {
    if (!characterId) return undefined
    const fromPlace = location?.places
      .flatMap((p) => p.characters)
      .find((c) => c.id === characterId)
    return fromPlace ?? allCharacters?.find((c) => c.id === characterId)
  }, [characterId, location, allCharacters])

  const transport = useMemo(() => {
    if (!chatId || !avatarId || !accessToken) return undefined
    return new DefaultChatTransport<UIMessage>({
      api: `${API_BASE_URL}/chats/${encodeURIComponent(chatId)}/message`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-avatar-id': avatarId,
        'x-locale': uiLanguage,
      },
      prepareSendMessagesRequest: ({ messages, body }) => {
        if (body && (body as { activity?: unknown }).activity === 'silence') {
          return { body: { activity: 'silence' } }
        }
        const last = messages[messages.length - 1]
        const message = last ? partsToText(last) : ''
        return { body: { message } }
      },
    })
  }, [chatId, avatarId, uiLanguage, accessToken])

  // A chat id can go stale within a session if the backend drops or rotates
  // it (e.g. staging DB reset). In that case the send fails with 403/404;
  // bounce back to the location so the next tap creates a fresh chat.
  function isStaleChatError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err)
    return (
      /\b(403|404)\b/.test(msg) ||
      /not the owner/i.test(msg) ||
      /forbidden/i.test(msg) ||
      /not ?found/i.test(msg)
    )
  }

  const { messages, sendMessage, status, error } = useChat({
    id: chatId,
    transport,
    onError: (err) => {
      if (isStaleChatError(err)) {
        toastError(t.chat.staleConversation)
        navigate(`/location/${currentLocationId ?? ''}`, { replace: true })
        return
      }
      toastError(err)
    },
  })

  const [input, setInput] = useState('')
  const [infoOpen, setInfoOpen] = useState(false)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const silenceFiredRef = useRef(false)

  useEffect(() => {
    if (!infoOpen) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setInfoOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [infoOpen])

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

  // Reset the silence gate on any user-initiated input change (including the
  // implicit clear after a send) so the next idle window can fire again.
  useEffect(() => {
    silenceFiredRef.current = false
  }, [input])

  // After SILENCE_IDLE_MS of quiet — empty input, idle stream, and at least
  // one prior message — fire one `activity: 'silence'` to let the AI react.
  // The gate prevents loops if the AI's silence reply comes back without any
  // user activity in between.
  useEffect(() => {
    if (!chatId) return
    if (status === 'streaming' || status === 'submitted') return
    if (input.trim().length > 0) return
    if (messages.length === 0) return
    if (silenceFiredRef.current) return

    const timer = window.setTimeout(() => {
      silenceFiredRef.current = true
      void sendMessage(undefined, { body: { activity: 'silence' } })
    }, SILENCE_IDLE_MS)

    return () => window.clearTimeout(timer)
  }, [chatId, status, input, messages.length, sendMessage])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || status === 'streaming' || status === 'submitted') return
    setInput('')
    void sendMessage({ text })
  }

  if (!avatarId || !avatarStyle || !avatarSeed) return null

  const isStreaming = status === 'streaming' || status === 'submitted'

  return (
    <div className="h-dvh flex flex-col">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-city-bg/80 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-center gap-3">
          <button
            className="btn-ghost shrink-0"
            aria-label={t.common.back}
            onClick={() => navigate(currentLocationId ? `/location/${currentLocationId}` : '/map')}
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline sm:ml-1">{t.common.back}</span>
          </button>
          {character && (
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={npcAvatarUrl(character)}
                alt=""
                className="h-10 w-10 rounded-full border border-white/10 shrink-0"
              />
              <div className="min-w-0">
                <p className="font-display font-semibold truncate">
                  {character.firstName} {character.lastName}
                </p>
                <p className="text-xs text-city-muted truncate">
                  {character.title}
                  {place ? ` · ${place.name}` : ''}
                </p>
              </div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {character && (
              <button
                type="button"
                className="btn-ghost p-2"
                onClick={() => setInfoOpen(true)}
                aria-label={t.chat.info.open}
                title={t.chat.info.open}
              >
                <InfoIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <main ref={scrollerRef} className="flex-1 overflow-y-auto">
        <div ref={contentRef} className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-4">
          {messages.length === 0 && !isStreaming && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card p-6 text-center"
            >
              <p className="text-sm text-city-muted">
                {t.chat.sayHello(character?.firstName ?? t.chat.theyFallback)}
              </p>
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
                  className={cn('flex items-start gap-2', isUser ? 'justify-end' : 'justify-start')}
                >
                  {!isUser && character && (
                    <img
                      src={npcAvatarUrl(character)}
                      alt=""
                      className="h-8 w-8 rounded-full border border-white/10 shrink-0"
                    />
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words',
                      isUser
                        ? 'bg-city-accent text-slate-900 rounded-tr-sm'
                        : 'bg-white/[0.06] border border-white/10 text-city-ink rounded-tl-sm',
                    )}
                  >
                    {isUser ? (
                      text
                    ) : text ? (
                      <StreamingText text={text} streaming={isStreamingThis} />
                    ) : (
                      <TypingDots label={t.chat.typing} />
                    )}
                  </div>
                  {isUser && (
                    <img
                      src={avatarUrl(avatarStyle, avatarSeed, 64)}
                      alt={player ? `${player.firstName} ${player.lastName}` : ''}
                      className="h-8 w-8 rounded-full border border-white/10 shrink-0"
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
                  {character && (
                    <img
                      src={npcAvatarUrl(character)}
                      alt=""
                      className="h-8 w-8 rounded-full border border-white/10 shrink-0"
                    />
                  )}
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm bg-white/[0.06] border border-white/10 text-city-ink">
                    <TypingDots label={t.chat.typing} />
                  </div>
                </motion.div>
              )}
          </AnimatePresence>

          {error && <div className="text-sm text-red-300/90 text-center">{error.message}</div>}
        </div>
      </main>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 border-t border-white/5 bg-city-bg/80 backdrop-blur-md"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-end gap-2">
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
            placeholder={t.chat.messagePlaceholder(character?.firstName)}
            className="input resize-none overflow-y-auto max-h-40 leading-relaxed py-2"
            disabled={!chatId}
          />
          <button
            type="submit"
            className="btn-primary py-3"
            disabled={!input.trim() || isStreaming}
            aria-label={t.common.send}
          >
            <svg
              className="h-5 w-5 sm:hidden"
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
            <span className="hidden sm:inline">{t.common.send}</span>
          </button>
        </div>
      </form>

      <AnimatePresence>
        {infoOpen && character && (
          <CharacterInfoModal
            t={t}
            character={character}
            placeName={place?.name}
            onClose={() => setInfoOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CharacterInfoModal({
  t,
  character,
  placeName,
  onClose,
}: {
  t: Messages
  character: CharacterDto
  placeName: string | undefined
  onClose: () => void
}) {
  return (
    <>
      <motion.div
        key="info-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-3">
        <motion.div
          key="info-panel"
          role="dialog"
          aria-modal="true"
          aria-label={t.chat.info.title}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="card pointer-events-auto w-full max-h-[85vh] flex flex-col overflow-hidden bg-city-panel/95 sm:max-w-md"
        >
          <header className="flex items-start gap-4 border-b border-white/5 p-5">
            <img
              src={npcAvatarUrl(character)}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full border border-white/10 bg-white/5"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-semibold text-city-ink truncate">
                {character.firstName} {character.lastName}
              </h2>
              <p className="text-sm text-city-accent/90 truncate">{character.title}</p>
              {placeName && (
                <p className="text-xs text-city-muted truncate mt-0.5">{placeName}</p>
              )}
            </div>
            <button
              type="button"
              className="btn-ghost p-2 shrink-0"
              onClick={onClose}
              aria-label={t.chat.info.close}
              title={t.chat.info.close}
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </header>
          <div className="overflow-y-auto p-5 space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-city-muted">
                  {t.chat.info.age}
                </dt>
                <dd className="mt-0.5 text-city-ink">{character.age}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-city-muted">
                  {t.chat.info.sex}
                </dt>
                <dd className="mt-0.5 text-city-ink">
                  {t.sex[character.sex as PlayerSex]}
                </dd>
              </div>
            </dl>
            <section>
              <h3 className="text-xs uppercase tracking-wide text-city-muted">
                {t.chat.info.personality}
              </h3>
              <p className="mt-1 text-city-ink whitespace-pre-wrap">
                {character.personality}
              </p>
            </section>
            <section>
              <h3 className="text-xs uppercase tracking-wide text-city-muted">
                {t.chat.info.backstory}
              </h3>
              <p className="mt-1 text-city-ink whitespace-pre-wrap">
                {character.backstory}
              </p>
            </section>
            {(() => {
              const systemInstructions = characterSystemInstructions(character)
              if (!systemInstructions) return null
              return (
                <section>
                  <h3 className="text-xs uppercase tracking-wide text-city-muted">
                    {t.chat.info.systemInstructions}
                  </h3>
                  <p className="mt-1 text-city-ink whitespace-pre-wrap">
                    {systemInstructions}
                  </p>
                </section>
              )
            })()}
          </div>
        </motion.div>
      </div>
    </>
  )
}

function InfoIcon({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
