import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  avatarUrl,
  PLAYER_AVATAR_STYLES,
  type AvatarStyle,
} from '@/game/avatars'
import { useGameStore, type PlayerSex } from '@/game/store'
import { createAvatar, updateAvatar, useCurrentAvatar } from '@/api/avatars'
import type { AvatarDto } from '@/api/client'
import { toastError } from '@/components/Toaster'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Skeleton } from '@/components/Skeleton'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

function randomSeed() {
  return Math.random().toString(36).slice(2, 10)
}

const SEX_ORDER: PlayerSex[] = ['female', 'male', 'non_binary']

export default function OnboardingScreen() {
  const avatarId = useGameStore((s) => s.avatarId)
  const storedAvatarStyle = useGameStore((s) => s.avatarStyle)
  const storedAvatarSeed = useGameStore((s) => s.avatarSeed)

  const isEditing = avatarId !== null

  // When editing, wait for the existing profile to arrive before mounting the
  // form so its initial state can be derived from props (no setState in
  // effects required to backfill fields).
  const { data: existing, isLoading } = useCurrentAvatar()

  if (isEditing && isLoading && !existing) {
    return <OnboardingSkeleton />
  }

  return (
    <OnboardingForm
      existing={existing ?? null}
      defaultAvatarStyle={storedAvatarStyle ?? 'adventurer'}
      defaultAvatarSeed={storedAvatarSeed ?? randomSeed()}
    />
  )
}

function OnboardingSkeleton() {
  return (
    <div className="min-h-dvh grid place-items-center p-4 sm:p-8">
      <div className="card w-full max-w-2xl space-y-4 p-6 sm:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-40 rounded-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

interface OnboardingFormProps {
  existing: AvatarDto | null
  defaultAvatarStyle: AvatarStyle
  defaultAvatarSeed: string
}

function OnboardingForm({
  existing,
  defaultAvatarStyle,
  defaultAvatarSeed,
}: OnboardingFormProps) {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setAvatar = useGameStore((s) => s.setAvatar)
  const clearAvatar = useGameStore((s) => s.clearAvatar)

  const [firstName, setFirstName] = useState(existing?.firstName ?? '')
  const [lastName, setLastName] = useState(existing?.lastName ?? '')
  const [age, setAge] = useState<number>(existing?.age ?? 30)
  const [sex, setSex] = useState<PlayerSex>(existing?.sex ?? 'non_binary')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [backstory, setBackstory] = useState(existing?.backstory ?? '')
  const [seed, setSeed] = useState(defaultAvatarSeed)
  const [style, setStyle] = useState<AvatarStyle>(defaultAvatarStyle)
  const [confirmStartOver, setConfirmStartOver] = useState(false)

  const isEditing = existing !== null

  const preview = useMemo(() => avatarUrl(style, seed, 192), [style, seed])
  const canContinue =
    firstName.trim().length >= 2 &&
    lastName.trim().length >= 1 &&
    age > 0 &&
    title.trim().length >= 2 &&
    backstory.trim().length >= 10

  const createAvatarMutation = useMutation({
    mutationFn: createAvatar,
    onError: (err) => toastError(err),
  })
  const updateAvatarMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof updateAvatar>[1] }) =>
      updateAvatar(id, body),
    onError: (err) => toastError(err),
  })

  const isSubmitting =
    createAvatarMutation.isPending || updateAvatarMutation.isPending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canContinue || isSubmitting) return

    const body = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      age,
      sex,
      title: title.trim(),
      backstory: backstory.trim(),
    }

    try {
      const avatar = existing
        ? await updateAvatarMutation.mutateAsync({ id: existing.id, body })
        : await createAvatarMutation.mutateAsync(body)
      // Seed the React Query cache so the next screen doesn't have to
      // re-fetch the profile we already have in hand.
      queryClient.setQueryData(['current-avatar', avatar.id], avatar)
      setAvatar({
        id: avatar.id,
        avatarStyle: style,
        avatarSeed: seed,
      })
      navigate('/map')
    } catch {
      // toast already shown via onError
    }
  }

  function handleStartOver() {
    clearAvatar()
    queryClient.removeQueries({ queryKey: ['current-avatar'] })
    setFirstName('')
    setLastName('')
    setAge(30)
    setSex('non_binary')
    setTitle('')
    setBackstory('')
    setStyle('adventurer')
    setSeed(randomSeed())
    setConfirmStartOver(false)
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
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isEditing ? (
              confirmStartOver ? (
                <>
                  <button
                    type="button"
                    onClick={handleStartOver}
                    disabled={isSubmitting}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t.onboarding.startOverConfirm}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmStartOver(false)}
                    disabled={isSubmitting}
                    className="rounded-lg px-3 py-1.5 text-xs text-city-muted transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {t.onboarding.startOverCancel}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmStartOver(true)}
                  disabled={isSubmitting}
                  className="btn-ghost text-xs"
                >
                  {t.onboarding.startOver}
                </button>
              )
            ) : null}
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={!canContinue || isSubmitting}
          >
            {isEditing
              ? isSubmitting
                ? t.onboarding.saving
                : t.onboarding.saveChanges
              : isSubmitting
                ? t.onboarding.submitting
                : t.onboarding.submit}
          </button>
        </div>
      </motion.form>
    </div>
  )
}
