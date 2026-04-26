import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMe, useMyAvatars, useLogout } from '@/api/auth'
import { useGameStore } from '@/game/store'
import { avatarUrl, type AvatarStyle } from '@/game/avatars'
import type { AvatarDto } from '@/api/client'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { Skeleton } from '@/components/Skeleton'
import { toastError } from '@/components/Toaster'
import { useT } from '@/i18n'

function fallbackCosmetics(avatar: AvatarDto): {
  style: AvatarStyle
  seed: string
} {
  const style: AvatarStyle =
    avatar.sex === 'non_binary' ? 'notionists' : 'lorelei'
  return {
    style,
    seed: `${avatar.firstName}-${avatar.lastName}-${avatar.id.slice(0, 6)}`,
  }
}

export default function AvatarPickerScreen() {
  const t = useT()
  const navigate = useNavigate()
  const avatarId = useGameStore((s) => s.avatarId)
  const setActiveAvatar = useGameStore((s) => s.setActiveAvatar)
  const cosmeticsMap = useGameStore((s) => s.avatarCosmetics)

  const { data: me } = useMe()
  const { data: avatars, isLoading, error } = useMyAvatars()
  const logoutMutation = useLogout()

  useEffect(() => {
    if (error) toastError(error)
  }, [error])

  // If the user only has a single avatar, skip the picker entirely.
  useEffect(() => {
    if (!avatars || avatars.length !== 1) return
    setActiveAvatar({ id: avatars[0].id })
    navigate('/map', { replace: true })
  }, [avatars, setActiveAvatar, navigate])

  function pick(avatar: AvatarDto) {
    setActiveAvatar({ id: avatar.id })
    navigate('/map')
  }

  function handleSignOut() {
    logoutMutation.mutate(undefined, {
      onSettled: () => navigate('/login', { replace: true }),
    })
  }

  const canCancelToMap = Boolean(
    avatarId && avatars?.some((a) => a.id === avatarId),
  )

  return (
    <div className="min-h-dvh grid place-items-center p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card w-full max-w-2xl p-6 sm:p-8"
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-city-accent">
              {t.onboarding.welcomeTo}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">
              {t.avatars.pickerTitle}
            </h1>
            <p className="text-city-muted mt-2 text-sm sm:text-base">
              {t.avatars.pickerSubtitle}
            </p>
            {me && (
              <p className="text-city-muted mt-2 text-xs">
                {t.auth.signedInAs}{' '}
                <span className="text-city-ink">{me.name || me.email}</span>
              </p>
            )}
          </div>
          <LanguageSwitcher className="shrink-0" />
        </header>

        {isLoading && (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {!isLoading && avatars && avatars.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {avatars.map((avatar) => {
              const cosmetics =
                cosmeticsMap[avatar.id] ?? fallbackCosmetics(avatar)
              return (
                <button
                  key={avatar.id}
                  type="button"
                  onClick={() => pick(avatar)}
                  className="card flex items-center gap-3 p-4 text-left transition-colors hover:border-city-accent/60"
                >
                  <img
                    src={avatarUrl(cosmetics.style, cosmetics.seed, 96)}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-full border border-white/10 bg-white/5"
                  />
                  <div className="min-w-0">
                    <p className="font-display font-semibold truncate">
                      {avatar.firstName} {avatar.lastName}
                    </p>
                    <p className="truncate text-xs text-city-accent/90">
                      {avatar.title}
                    </p>
                    <p className="truncate text-xs text-city-muted">
                      {t.sex[avatar.sex]} · {avatar.age}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {!isLoading && avatars && avatars.length === 0 && (
          <p className="text-sm text-city-muted">{t.avatars.empty}</p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {canCancelToMap ? (
              <button
                type="button"
                className="btn-ghost text-xs"
                onClick={handleSignOut}
                disabled={logoutMutation.isPending}
              >
                {t.auth.signOut}
              </button>
            ) : null}
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={
                canCancelToMap ? () => navigate('/map') : handleSignOut
              }
              disabled={logoutMutation.isPending}
            >
              {t.common.cancel}
            </button>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate('/onboarding')}
          >
            {t.avatars.create}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
