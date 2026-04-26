import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  GoogleLogin,
  useGoogleOneTapLogin,
  type CredentialResponse,
} from '@react-oauth/google'
import {
  ME_QUERY_KEY,
  MY_AVATARS_QUERY_KEY,
  getMe,
  googleAuth,
  listMyAvatars,
} from '@/api/auth'
import { useGameStore } from '@/game/store'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { toastError, toast } from '@/components/Toaster'
import { useT } from '@/i18n'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

export default function LoginScreen() {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useGameStore((s) => s.accessToken)
  const setSession = useGameStore((s) => s.setSession)
  const setAuthUser = useGameStore((s) => s.setAuthUser)
  const setActiveAvatar = useGameStore((s) => s.setActiveAvatar)

  // Anyone with a live session who lands on /login should bounce out so we
  // don't render a sign-in form behind their game.
  useEffect(() => {
    if (accessToken) navigate('/map', { replace: true })
  }, [accessToken, navigate])

  const loginMutation = useMutation({
    mutationFn: async (idToken: string) => {
      const tokens = await googleAuth(idToken)
      // Persist tokens before any authed call so the next requests pick them
      // up via apiFetchAuthed.
      setSession(tokens)
      const [user, avatars] = await Promise.all([getMe(), listMyAvatars()])
      setAuthUser(user)
      queryClient.setQueryData(ME_QUERY_KEY, user)
      queryClient.setQueryData(MY_AVATARS_QUERY_KEY, avatars)
      return { user, avatars }
    },
    onError: (err) => toastError(err),
    onSuccess: ({ avatars }) => {
      if (avatars.length === 0) {
        navigate('/onboarding', { replace: true })
        return
      }
      if (avatars.length === 1) {
        setActiveAvatar({ id: avatars[0].id })
        navigate('/map', { replace: true })
        return
      }
      navigate('/avatars', { replace: true })
    },
  })

  function handleCredential(cr: CredentialResponse) {
    if (!cr.credential) {
      toast(t.login.error, 'error')
      return
    }
    loginMutation.mutate(cr.credential)
  }

  // Google One Tap auto-prompts when the user has a Google session. We
  // disable it once we have a sign-in mutation in flight or already done.
  useGoogleOneTapLogin({
    onSuccess: handleCredential,
    onError: () => toast(t.login.error, 'error'),
    disabled:
      !GOOGLE_CLIENT_ID ||
      loginMutation.isPending ||
      loginMutation.isSuccess ||
      Boolean(accessToken),
  })

  return (
    <div className="min-h-dvh grid place-items-center p-4 sm:p-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="card w-full max-w-md p-6 sm:p-8"
      >
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-city-accent">
              {t.onboarding.welcomeTo}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold mt-1">
              {t.login.title}
            </h1>
            <p className="text-city-muted mt-2 text-sm sm:text-base">
              {t.login.subtitle}
            </p>
          </div>
          <LanguageSwitcher className="shrink-0" />
        </header>

        <div className="flex flex-col items-center gap-3 py-2">
          {GOOGLE_CLIENT_ID ? (
            <GoogleLogin
              onSuccess={handleCredential}
              onError={() => toast(t.login.error, 'error')}
              useOneTap={false}
              theme="filled_black"
              shape="pill"
              size="large"
              text="continue_with"
            />
          ) : (
            <p className="rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
              {t.login.missingClientId}
            </p>
          )}
          {loginMutation.isPending && (
            <p className="text-xs text-city-muted">{t.onboarding.submitting}</p>
          )}
        </div>
      </motion.div>
    </div>
  )
}
