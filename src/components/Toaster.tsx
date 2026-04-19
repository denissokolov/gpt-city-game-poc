import { create } from 'zustand'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { getMessages } from '@/i18n'

type Toast = {
  id: string
  kind: 'error' | 'success' | 'info'
  message: string
}

type ToastState = {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
}

const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }))
    return id
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}))

export function toast(message: string, kind: Toast['kind'] = 'info') {
  return useToastStore.getState().push({ message, kind })
}

export function toastError(err: unknown) {
  const fallback = getMessages().common.somethingWentWrong
  const msg =
    err instanceof Error ? err.message : typeof err === 'string' ? err : fallback
  return toast(msg, 'error')
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) =>
      setTimeout(() => dismiss(t.id), t.kind === 'error' ? 6000 : 3500),
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts, dismiss])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-3">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className={
              'pointer-events-auto max-w-md rounded-xl px-4 py-2.5 text-sm shadow-lg border backdrop-blur-md ' +
              (t.kind === 'error'
                ? 'bg-red-500/15 border-red-400/40 text-red-100'
                : t.kind === 'success'
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100'
                  : 'bg-white/10 border-white/15 text-white')
            }
            onClick={() => dismiss(t.id)}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
