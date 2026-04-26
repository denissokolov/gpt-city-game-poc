import { lazy, Suspense, useEffect, useState } from 'react'
import { matchPath, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '@/game/store'
import { useT } from '@/i18n'

const SystemChatPanel = lazy(() => import('./SystemChatPanel'))

const HIDDEN_ROUTES = ['/chat/:chatId', '/onboarding']

function isHiddenPath(pathname: string): boolean {
  return HIDDEN_ROUTES.some((pattern) => matchPath(pattern, pathname) != null)
}

export default function SystemChatLauncher() {
  const t = useT()
  const userId = useGameStore((s) => s.userId)
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  const hidden = isHiddenPath(pathname)

  // Close the panel automatically when navigating into a hidden route
  // (e.g. tapping into a character chat) so it doesn't reopen later in
  // an unexpected place.
  useEffect(() => {
    if (hidden && open) setOpen(false)
  }, [hidden, open])

  // Close on Escape for keyboard accessibility.
  useEffect(() => {
    if (!open) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!userId || hidden) return null

  return (
    <>
      <button
        type="button"
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-city-accent text-slate-900 shadow-lg shadow-black/30 transition-colors hover:bg-amber-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-city-accent/70 sm:bottom-6 sm:right-6"
        aria-label={open ? t.systemChat.close : t.systemChat.open}
        onClick={() => setOpen((prev) => !prev)}
      >
        {open ? (
          <CloseIcon className="h-5 w-5" />
        ) : (
          <SparklesIcon className="h-5 w-5" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              key="panel"
              role="dialog"
              aria-modal="true"
              aria-label={t.systemChat.title}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="card fixed inset-x-3 bottom-20 top-3 z-40 flex flex-col overflow-hidden bg-city-panel/95 sm:inset-auto sm:bottom-24 sm:right-6 sm:top-auto sm:h-[36rem] sm:w-[26rem]"
            >
              <Suspense
                fallback={
                  <div className="flex flex-1 items-center justify-center text-sm text-city-muted">
                    {t.systemChat.typing}
                  </div>
                }
              >
                <SystemChatPanel onClose={() => setOpen(false)} />
              </Suspense>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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
