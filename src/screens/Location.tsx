import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useLocation } from '@/api/locations'
import { createChat } from '@/api/chats'
import { useGameStore } from '@/game/store'
import { NpcCard } from '@/components/NpcCard'
import { PlacePicker } from '@/components/PlacePicker'
import { Skeleton } from '@/components/Skeleton'
import { toastError } from '@/components/Toaster'
import type { CharacterDto, PlaceDto } from '@/api/client'

export default function LocationScreen() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const setCurrentLocation = useGameStore((s) => s.setCurrentLocation)
  const getChatId = useGameStore((s) => s.getChatId)
  const rememberChatId = useGameStore((s) => s.rememberChatId)

  const { data: location, isLoading, error } = useLocation(id)

  const [pickerFor, setPickerFor] = useState<CharacterDto | null>(null)

  useEffect(() => {
    if (id) setCurrentLocation(id)
  }, [id, setCurrentLocation])

  useEffect(() => {
    if (error) toastError(error)
  }, [error])

  const createChatMutation = useMutation({
    mutationFn: createChat,
    onError: (err) => toastError(err),
  })

  async function openChat(character: CharacterDto, place: PlaceDto) {
    const existing = getChatId(place.id, character.id)
    if (existing) {
      navigate(`/chat/${existing}?placeId=${place.id}&characterId=${character.id}`)
      return
    }
    const chat = await createChatMutation.mutateAsync({
      characterIds: [character.id],
      placeId: place.id,
    })
    rememberChatId(place.id, character.id, chat.id)
    navigate(`/chat/${chat.id}?placeId=${place.id}&characterId=${character.id}`)
  }

  return (
    <div className="min-h-dvh p-4 sm:p-8">
      <header className="mx-auto max-w-6xl mb-6 flex items-center gap-3">
        <button className="btn-ghost" onClick={() => navigate('/map')}>
          ← Back to map
        </button>
      </header>

      <section className="mx-auto max-w-6xl">
        {isLoading && (
          <div className="grid gap-6 md:grid-cols-[260px,1fr]">
            <Skeleton className="h-80" />
            <div className="space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </div>
        )}

        {location && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="grid gap-6 md:grid-cols-[280px,1fr]"
          >
            <aside className="space-y-4">
              <div className="card p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-city-accent">
                  Location · {location.locale}
                </p>
                <h1 className="mt-1 font-display text-2xl font-bold">
                  {location.name}
                </h1>
                <p className="mt-2 text-sm text-city-muted whitespace-pre-wrap">
                  {location.description}
                </p>
              </div>

              <div className="card p-5">
                <h2 className="font-display text-sm uppercase tracking-wider text-city-muted mb-3">
                  Places ({location.places.length})
                </h2>
                <ul className="space-y-2">
                  {location.places.map((p) => (
                    <li
                      key={p.id}
                      className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                    >
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-city-muted line-clamp-2">
                        {p.description}
                      </div>
                    </li>
                  ))}
                  {location.places.length === 0 && (
                    <li className="text-sm text-city-muted">
                      No notable spots here yet.
                    </li>
                  )}
                </ul>
              </div>
            </aside>

            <div>
              <h2 className="font-display text-sm uppercase tracking-wider text-city-muted mb-3">
                People here ({location.characters.length})
              </h2>
              {location.characters.length === 0 ? (
                <div className="card p-6 text-city-muted text-sm">
                  Nobody is around right now.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {location.characters.map((c) => (
                    <NpcCard
                      key={c.id}
                      character={c}
                      onClick={() => setPickerFor(c)}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </section>

      <PlacePicker
        open={pickerFor !== null}
        character={pickerFor}
        places={location?.places ?? []}
        onClose={() => setPickerFor(null)}
        onPick={async (place) => {
          const who = pickerFor
          setPickerFor(null)
          if (who) await openChat(who, place)
        }}
      />
    </div>
  )
}
