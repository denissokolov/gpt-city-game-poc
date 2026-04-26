import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/Toaster'
import { Skeleton } from '@/components/Skeleton'
import { useGameStore } from '@/game/store'
import { useAutoRefreshTokens, useMe, useMyAvatars } from '@/api/auth'

const LoginScreen = lazy(() => import('@/screens/Login'))
const OnboardingScreen = lazy(() => import('@/screens/Onboarding'))
const AvatarPickerScreen = lazy(() => import('@/screens/AvatarPicker'))
const MapScreen = lazy(() => import('@/screens/Map'))
const LocationScreen = lazy(() => import('@/screens/Location'))
const ChatScreen = lazy(() => import('@/screens/Chat'))
const SystemChatLauncher = lazy(
  () => import('@/components/SystemChat/SystemChatLauncher'),
)

function RequireAuth({ children }: { children: React.ReactNode }) {
  const accessToken = useGameStore((s) => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return <>{children}</>
}

// Ensures the user has selected an active avatar before letting them into
// game screens. Redirects to /onboarding when the user owns zero avatars
// and to /avatars when they own multiple but haven't picked one yet.
function RequireAvatar({ children }: { children: React.ReactNode }) {
  const avatarId = useGameStore((s) => s.avatarId)
  const { data: avatars, isLoading, isError } = useMyAvatars()

  if (isLoading && !avatars) return <ScreenFallback />
  // If the avatars query failed (e.g. session was invalidated server-side),
  // fall back to the login flow.
  if (isError && !avatars) return <Navigate to="/login" replace />
  if (!avatars || avatars.length === 0)
    return <Navigate to="/onboarding" replace />
  if (!avatarId || !avatars.find((a) => a.id === avatarId))
    return <Navigate to="/avatars" replace />
  return <>{children}</>
}

function ScreenFallback() {
  return (
    <div className="min-h-dvh p-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  )
}

// Boot-time auth bookkeeping. `useAutoRefreshTokens` schedules proactive
// refreshes, `useMe` keeps `/auth/me` warm and populates the persisted
// `authUser`. Anything that needs to redirect on token loss is handled by
// `RequireAuth` on the affected route.
function AuthBoot() {
  useAutoRefreshTokens()
  useMe()
  return null
}

export default function App() {
  return (
    <>
      <AuthBoot />
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/avatars"
            element={
              <RequireAuth>
                <AvatarPickerScreen />
              </RequireAuth>
            }
          />
          <Route
            path="/map"
            element={
              <RequireAuth>
                <RequireAvatar>
                  <MapScreen />
                </RequireAvatar>
              </RequireAuth>
            }
          />
          <Route
            path="/location/:id"
            element={
              <RequireAuth>
                <RequireAvatar>
                  <LocationScreen />
                </RequireAvatar>
              </RequireAuth>
            }
          />
          <Route
            path="/chat/:chatId"
            element={
              <RequireAuth>
                <RequireAvatar>
                  <ChatScreen />
                </RequireAvatar>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/map" replace />} />
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        <SystemChatLauncher />
      </Suspense>
      <Toaster />
    </>
  )
}
