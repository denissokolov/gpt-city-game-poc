import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore } from '@/game/store'
import { useT, type Messages } from '@/i18n'
import { cn } from '@/lib/cn'

type PresetId = keyof Messages['timeChanger']['presets']

type Preset = {
  id: PresetId
  hour: number
  minute: number
  emoji: string
}

const PRESETS: Preset[] = [
  { id: 'dawn', hour: 6, minute: 30, emoji: '🌅' },
  { id: 'morning', hour: 9, minute: 0, emoji: '☀️' },
  { id: 'noon', hour: 12, minute: 30, emoji: '🌞' },
  { id: 'evening', hour: 18, minute: 0, emoji: '🌇' },
  { id: 'night', hour: 22, minute: 30, emoji: '🌙' },
]

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

// datetime-local values are `YYYY-MM-DDTHH:mm` interpreted as LOCAL time.
function isoToLocalInput(iso: string | null): string {
  const d = iso ? new Date(iso) : new Date()
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

function localInputToIso(value: string): string {
  // `new Date('YYYY-MM-DDTHH:mm')` parses as local time in every evergreen browser.
  return new Date(value).toISOString()
}

function formatClock(
  iso: string | null,
  t: Messages,
  locale: string,
): {
  time: string
  date: string
  label: string
} {
  const d = iso ? new Date(iso) : new Date()
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const date = d.toLocaleDateString(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const hour = d.getHours()
  const parts = t.timeChanger.partsOfDay
  let label = parts.night
  if (hour >= 5 && hour < 11) label = parts.morning
  else if (hour >= 11 && hour < 14) label = parts.midday
  else if (hour >= 14 && hour < 18) label = parts.afternoon
  else if (hour >= 18 && hour < 22) label = parts.evening
  return { time, date, label }
}

export function TimeChanger() {
  const t = useT()
  const locale = useGameStore((s) => s.uiLanguage)
  const timeOverride = useGameStore((s) => s.timeOverride)
  const setTimeOverride = useGameStore((s) => s.setTimeOverride)

  // Keep a ticking "live" clock only when no override is active, so the
  // header doesn't silently go stale while the user is picking a time.
  const [now, setNow] = useState(() => new Date().toISOString())
  useEffect(() => {
    if (timeOverride) return
    const id = setInterval(() => setNow(new Date().toISOString()), 30_000)
    return () => clearInterval(id)
  }, [timeOverride])

  const effective = timeOverride ?? now
  const clock = formatClock(effective, t, locale)

  function applyPreset(preset: Preset) {
    const base = timeOverride ? new Date(timeOverride) : new Date()
    base.setHours(preset.hour, preset.minute, 0, 0)
    setTimeOverride(base.toISOString())
  }

  const activePreset = timeOverride
    ? PRESETS.find((p) => {
        const d = new Date(timeOverride)
        return d.getHours() === p.hour && d.getMinutes() === p.minute
      })
    : undefined

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'grid place-items-center h-14 w-14 rounded-2xl border transition-colors',
              timeOverride
                ? 'border-city-accent/60 bg-city-accent/10 text-city-accent'
                : 'border-white/10 bg-white/5 text-city-ink',
            )}
            aria-hidden
          >
            <motion.span
              key={clock.time}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-lg font-semibold tabular-nums"
            >
              {clock.time}
            </motion.span>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-city-muted">
              {timeOverride ? t.timeChanger.pretending : t.timeChanger.localTime}
            </p>
            <p className="font-display text-base sm:text-lg font-semibold">
              {clock.label}
              <span className="ml-2 text-city-muted text-sm font-normal">
                {clock.date}
              </span>
            </p>
          </div>
        </div>

        <AnimatePresence>
          {timeOverride && (
            <motion.button
              type="button"
              onClick={() => setTimeOverride(null)}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className="btn-ghost text-xs"
            >
              {t.timeChanger.resetToNow}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {PRESETS.map((preset) => {
          const isActive = activePreset?.id === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                isActive
                  ? 'border-city-accent bg-city-accent text-slate-900 shadow-[0_0_24px_-6px_rgba(245,177,76,0.7)]'
                  : 'border-white/10 bg-white/5 text-city-ink hover:border-city-accent/50 hover:text-city-accent',
              )}
            >
              <span aria-hidden>{preset.emoji}</span>
              <span>{t.timeChanger.presets[preset.id]}</span>
            </button>
          )
        })}

        <label className="ml-auto flex items-center gap-2 text-xs text-city-muted">
          <span className="hidden sm:inline">{t.timeChanger.exactTime}</span>
          <input
            type="datetime-local"
            value={isoToLocalInput(effective)}
            onChange={(e) => {
              if (!e.target.value) return
              setTimeOverride(localInputToIso(e.target.value))
            }}
            className="input py-1.5 text-xs w-[12.5rem] tabular-nums"
          />
        </label>
      </div>
    </div>
  )
}
