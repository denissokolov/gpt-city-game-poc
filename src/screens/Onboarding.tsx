import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  avatarUrl,
  PLAYER_AVATAR_STYLES,
  type AvatarStyle,
} from '@/game/avatars'
import { useGameStore } from '@/game/store'
import { cn } from '@/lib/cn'

function randomSeed() {
  return Math.random().toString(36).slice(2, 10)
}

export default function OnboardingScreen() {
  const navigate = useNavigate()
  const existing = useGameStore((s) => s.player)
  const setPlayer = useGameStore((s) => s.setPlayer)

  const [name, setName] = useState(existing?.name ?? '')
  const [seed, setSeed] = useState(existing?.avatarSeed ?? randomSeed())
  const [style, setStyle] = useState<AvatarStyle>(
    existing?.avatarStyle ?? 'adventurer',
  )

  const preview = useMemo(() => avatarUrl(style, seed, 192), [style, seed])
  const canContinue = name.trim().length >= 2

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canContinue) return
    setPlayer({ name: name.trim(), avatarStyle: style, avatarSeed: seed })
    navigate('/map')
  }

  return (
    <div className="min-h-dvh grid place-items-center p-4 sm:p-8">
      <motion.form
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onSubmit={handleSubmit}
        className="card w-full max-w-2xl p-6 sm:p-8"
      >
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-city-accent">
            Welcome to
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">
            GPT City
          </h1>
          <p className="text-city-muted mt-2 text-sm sm:text-base">
            Create your avatar, walk the streets, and strike up conversations
            with the minds who live here.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-[auto,1fr] sm:items-start">
          <div className="flex flex-col items-center gap-3">
            <motion.div
              key={preview}
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="h-40 w-40 rounded-full border-2 border-city-accent/40 shadow-[0_0_40px_-10px_rgba(245,177,76,0.6)] overflow-hidden bg-white/5"
            >
              <img src={preview} alt="Avatar preview" className="h-full w-full" />
            </motion.div>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setSeed(randomSeed())}
            >
              Shuffle
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-city-muted">Your name</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ada"
                className="input mt-1"
                maxLength={40}
              />
            </label>

            <div>
              <span className="text-sm text-city-muted">Avatar style</span>
              <div className="mt-2 grid grid-cols-5 sm:grid-cols-5 gap-2">
                {PLAYER_AVATAR_STYLES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setStyle(s)}
                    aria-label={s}
                    className={cn(
                      'aspect-square rounded-xl border overflow-hidden transition-all bg-white/5',
                      s === style
                        ? 'border-city-accent ring-2 ring-city-accent/50'
                        : 'border-white/10 hover:border-white/25',
                    )}
                  >
                    <img
                      src={avatarUrl(s, seed, 96)}
                      alt=""
                      className="h-full w-full"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <button
            type="submit"
            className="btn-primary"
            disabled={!canContinue}
          >
            Enter the city →
          </button>
        </div>
      </motion.form>
    </div>
  )
}
