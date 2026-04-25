import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/Toaster'
import { Skeleton } from '@/components/Skeleton'
import { useGameStore } from '@/game/store'

const OnboardingScreen = lazy(() => import('@/screens/Onboarding'))
const MapScreen = lazy(() => import('@/screens/Map'))
const LocationScreen = lazy(() => import('@/screens/Location'))
const ChatScreen = lazy(() => import('@/screens/Chat'))
const SystemChatLauncher = lazy(
  () => import('@/components/SystemChat/SystemChatLauncher'),
)

function RequirePlayer({ children }: { children: React.ReactNode }) {
  const player = useGameStore((s) => s.player)
  if (!player) return <Navigate to="/onboarding" replace />
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

export default function App() {
  return (
    <>
      <Suspense fallback={<ScreenFallback />}>
        <Routes>
          <Route path="/" element={<Navigate to="/map" replace />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route
            path="/map"
            element={
              <RequirePlayer>
                <MapScreen />
              </RequirePlayer>
            }
          />
          <Route
            path="/location/:id"
            element={
              <RequirePlayer>
                <LocationScreen />
              </RequirePlayer>
            }
          />
          <Route
            path="/chat/:chatId"
            element={
              <RequirePlayer>
                <ChatScreen />
              </RequirePlayer>
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
