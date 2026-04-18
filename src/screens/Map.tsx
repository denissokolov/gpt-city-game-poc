import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useLocations } from '@/api/locations'
import { useGameStore } from '@/game/store'
import { getLocationPosition } from '@/game/cityLayout'
import { avatarUrl } from '@/game/avatars'
import { Skeleton } from '@/components/Skeleton'
import { toastError } from '@/components/Toaster'
import { cn } from '@/lib/cn'

export default function MapScreen() {
  const navigate = useNavigate()
  const player = useGameStore((s) => s.player)
  const currentLocationId = useGameStore((s) => s.currentLocationId)
  const setCurrentLocation = useGameStore((s) => s.setCurrentLocation)

  const { data: locations, isLoading, error } = useLocations()

  const [walkingTo, setWalkingTo] = useState<string | null>(null)

  useEffect(() => {
    if (error) toastError(error)
  }, [error])

  const positions = useMemo(() => {
    if (!locations) return {}
    const total = locations.length
    return Object.fromEntries(
      locations.map((loc, i) => [loc.id, getLocationPosition(loc.id, i, total)]),
    )
  }, [locations])

  useEffect(() => {
    if (!locations || locations.length === 0) return
    if (!currentLocationId || !locations.find((l) => l.id === currentLocationId)) {
      setCurrentLocation(locations[0].id)
    }
  }, [locations, currentLocationId, setCurrentLocation])

  const playerPos = useMemo(() => {
    const target = walkingTo ?? currentLocationId
    if (!target) return { x: 0.5, y: 0.5 }
    return positions[target] ?? { x: 0.5, y: 0.5 }
  }, [walkingTo, currentLocationId, positions])

  function handleClickNode(id: string) {
    if (id === currentLocationId) {
      navigate(`/location/${id}`)
      return
    }
    setWalkingTo(id)
  }

  function handleWalkComplete() {
    if (!walkingTo) return
    setCurrentLocation(walkingTo)
    const target = walkingTo
    setWalkingTo(null)
    setTimeout(() => navigate(`/location/${target}`), 150)
  }

  if (!player) return null

  return (
    <div className="min-h-dvh p-4 sm:p-8">
      <header className="mx-auto max-w-5xl mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl(player.avatarStyle, player.avatarSeed, 64)}
            alt=""
            className="h-10 w-10 rounded-full border border-white/10"
          />
          <div>
            <p className="text-xs text-city-muted">Playing as</p>
            <p className="font-display font-semibold">
              {player.firstName} {player.lastName}
            </p>
          </div>
        </div>
        <button
          className="btn-ghost text-xs"
          onClick={() => navigate('/onboarding')}
        >
          Change avatar
        </button>
      </header>

      <section className="mx-auto max-w-5xl">
        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-1">
          The City
        </h1>
        <p className="text-city-muted text-sm mb-4">
          Click your current location to explore it, or click a neighbor to walk
          over.
        </p>

        <div className="relative card overflow-hidden aspect-[16/10] min-h-[360px]">
          <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px]" />
          <svg className="absolute inset-0 h-full w-full" aria-hidden>
            {locations && locations.length > 1 &&
              locations.slice(1).map((loc, i) => {
                const a = positions[locations[i].id]
                const b = positions[loc.id]
                if (!a || !b) return null
                return (
                  <line
                    key={`line-${loc.id}`}
                    x1={`${a.x * 100}%`}
                    y1={`${a.y * 100}%`}
                    x2={`${b.x * 100}%`}
                    y2={`${b.y * 100}%`}
                    stroke="rgba(245,177,76,0.25)"
                    strokeDasharray="6 8"
                    strokeWidth={2}
                  />
                )
              })}
          </svg>

          {isLoading && (
            <div className="absolute inset-0 grid grid-cols-3 gap-6 p-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          )}

          {locations?.map((loc) => {
            const pos = positions[loc.id]
            if (!pos) return null
            const isCurrent = loc.id === currentLocationId && !walkingTo
            return (
              <motion.button
                key={loc.id}
                onClick={() => handleClickNode(loc.id)}
                disabled={Boolean(walkingTo)}
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2 px-3 py-2 rounded-xl text-sm font-semibold border backdrop-blur-md transition-colors text-left max-w-[180px]',
                  isCurrent
                    ? 'bg-city-accent text-slate-900 border-city-accent shadow-[0_0_40px_-8px_rgba(245,177,76,0.9)]'
                    : 'bg-city-panel/80 border-white/10 hover:border-city-accent/60 hover:text-city-accent',
                )}
                style={{
                  left: `${pos.x * 100}%`,
                  top: `${pos.y * 100}%`,
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
              >
                <span className="block truncate">{loc.name}</span>
                <span className="block text-[10px] uppercase tracking-wider opacity-70">
                  {loc.locale}
                </span>
              </motion.button>
            )
          })}

          <AnimatePresence>
            {locations && locations.length > 0 && (
              <motion.div
                className="absolute z-10 pointer-events-none"
                initial={false}
                animate={{
                  left: `${playerPos.x * 100}%`,
                  top: `${playerPos.y * 100}%`,
                }}
                transition={{
                  type: 'tween',
                  duration: walkingTo ? 1.1 : 0.4,
                  ease: 'easeInOut',
                }}
                onAnimationComplete={() => {
                  if (walkingTo) handleWalkComplete()
                }}
                style={{ translateX: '-50%', translateY: '-120%' }}
              >
                <div className="relative">
                  <motion.img
                    src={avatarUrl(player.avatarStyle, player.avatarSeed, 96)}
                    alt={`${player.firstName} ${player.lastName}`}
                    className="h-14 w-14 rounded-full border-2 border-white shadow-xl bg-white/10"
                    animate={
                      walkingTo
                        ? { y: [0, -4, 0, -4, 0] }
                        : { y: 0 }
                    }
                    transition={
                      walkingTo
                        ? { duration: 0.5, repeat: Infinity }
                        : { duration: 0.2 }
                    }
                  />
                  <div className="absolute left-1/2 -bottom-1 h-2 w-8 -translate-x-1/2 rounded-full bg-black/40 blur-[2px]" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  )
}
