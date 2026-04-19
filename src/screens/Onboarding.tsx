import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation } from '@tanstack/react-query'
import {
  avatarUrl,
  PLAYER_AVATAR_STYLES,
  type AvatarStyle,
} from '@/game/avatars'
import { useGameStore, type PlayerSex } from '@/game/store'
import { createUser } from '@/api/users'
import { toastError } from '@/components/Toaster'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

function randomSeed() {
  return Math.random().toString(36).slice(2, 10)
}

const SEX_ORDER: PlayerSex[] = ['female', 'male', 'non_binary']

export default function OnboardingScreen() {
  const t = useT()
  const navigate = useNavigate()
  const existing = useGameStore((s) => s.player)
  const setPlayer = useGameStore((s) => s.setPlayer)

  const [firstName, setFirstName] = useState(existing?.firstName ?? '')
  const [lastName, setLastName] = useState(existing?.lastName ?? '')
  const [age, setAge] = useState<number>(existing?.age ?? 30)
  const [sex, setSex] = useState<PlayerSex>(existing?.sex ?? 'non_binary')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [backstory, setBackstory] = useState(existing?.backstory ?? '')
  const [seed, setSeed] = useState(existing?.avatarSeed ?? randomSeed())
  const [style, setStyle] = useState<AvatarStyle>(
    existing?.avatarStyle ?? 'adventurer',
  )

  const preview = useMemo(() => avatarUrl(style, seed, 192), [style, seed])
  const canContinue =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 1 &&
    age > 0 &&
    title.trim().length >= 2 &&
    backstory.trim().length >= 10

  const createUserMutation = useMutation({
    mutationFn: createUser,
    onError: (err) => toastError(err),
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canContinue || createUserMutation.isPending) return

    try {
      const user = await createUserMutation.mutateAsync({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age,
        sex,
        title: title.trim(),
        backstory: backstory.trim(),
      })
      setPlayer({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        age: user.age,
        sex: user.sex,
        title: user.title,
        backstory: user.backstory,
        avatarStyle: style,
        avatarSeed: seed,
      })
      navigate('/map')
    } catch {
      // toast already shown via onError
    }
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
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-city-accent">
              {t.onboarding.welcomeTo}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">
              {t.onboarding.title}
            </h1>
            <p className="text-city-muted mt-2 text-sm sm:text-base">
              {t.onboarding.subtitle}
            </p>
          </div>
          <LanguageSwitcher className="shrink-0" />
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
              <img
                src={preview}
                alt={t.onboarding.avatarPreviewAlt}
                className="h-full w-full"
              />
            </motion.div>
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => setSeed(randomSeed())}
            >
              {t.common.shuffle}
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-city-muted">
                  {t.onboarding.firstName}
                </span>
                <input
                  autoFocus
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder={t.onboarding.firstNamePlaceholder}
                  className="input mt-1"
                  maxLength={40}
                />
              </label>
              <label className="block">
                <span className="text-sm text-city-muted">
                  {t.onboarding.lastName}
                </span>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder={t.onboarding.lastNamePlaceholder}
                  className="input mt-1"
                  maxLength={40}
                />
              </label>
            </div>

            <div className="grid grid-cols-[auto,1fr] gap-3 items-end">
              <label className="block">
                <span className="text-sm text-city-muted">
                  {t.onboarding.age}
                </span>
                <input
                  type="number"
                  min={1}
                  max={150}
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value) || 0)}
                  className="input mt-1 w-24"
                />
              </label>
              <div>
                <span className="text-sm text-city-muted">
                  {t.onboarding.sex}
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {SEX_ORDER.map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setSex(value)}
                      className={cn(
                        'rounded-lg border px-3 py-1.5 text-sm transition-colors',
                        sex === value
                          ? 'border-city-accent bg-city-accent/10 text-city-accent'
                          : 'border-white/10 text-city-muted hover:border-white/25',
                      )}
                    >
                      {t.sex[value]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <label className="block">
              <span className="text-sm text-city-muted">
                {t.onboarding.titleLabel}{' '}
                <span className="text-city-muted/70">
                  {t.onboarding.titleHint}
                </span>
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.onboarding.titlePlaceholder}
                className="input mt-1"
                maxLength={80}
              />
            </label>

            <label className="block">
              <span className="text-sm text-city-muted">
                {t.onboarding.backstoryLabel}{' '}
                <span className="text-city-muted/70">
                  {t.onboarding.backstoryHint}
                </span>
              </span>
              <textarea
                value={backstory}
                onChange={(e) => setBackstory(e.target.value)}
                placeholder={t.onboarding.backstoryPlaceholder}
                rows={3}
                className="input mt-1 resize-y min-h-[84px]"
                maxLength={600}
              />
              <span className="mt-1 block text-xs text-city-muted/70">
                {backstory.trim().length}/600
              </span>
            </label>

            <div>
              <span className="text-sm text-city-muted">
                {t.onboarding.avatarStyle}
              </span>
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
            disabled={!canContinue || createUserMutation.isPending}
          >
            {createUserMutation.isPending
              ? t.onboarding.submitting
              : t.onboarding.submit}
          </button>
        </div>
      </motion.form>
    </div>
  )
}
