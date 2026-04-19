import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { useLocationState } from '@/api/locations'
import { createChat } from '@/api/chats'
import { useGameStore } from '@/game/store'
import { NpcCard } from '@/components/NpcCard'
import { LocationLoading } from '@/components/LocationLoading'
import { TimeChanger } from '@/components/TimeChanger'
import { toastError } from '@/components/Toaster'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useT } from '@/i18n'
import type { CharacterDto, PlaceStateDto } from '@/api/client'

export default function LocationScreen() {
  const t = useT()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const player = useGameStore((s) => s.player)
  const setCurrentLocation = useGameStore((s) => s.setCurrentLocation)
  const getChatId = useGameStore((s) => s.getChatId)
  const rememberChatId = useGameStore((s) => s.rememberChatId)

  const { data: location, isLoading, error } = useLocationState(id)

  useEffect(() => {
    if (id) setCurrentLocation(id)
  }, [id, setCurrentLocation])

  useEffect(() => {
    if (error) toastError(error)
  }, [error])

  const createChatMutation = useMutation({
    mutationFn: ({
      body,
      userId,
    }: {
      body: Parameters<typeof createChat>[0]
      userId: string
    }) => createChat(body, userId),
    onError: (err) => toastError(err),
  })

  async function openChat(character: CharacterDto, place: PlaceStateDto) {
    if (!player) return
    const existing = getChatId(place.id, character.id)
    if (existing) {
      navigate(`/chat/${existing}?placeId=${place.id}&characterId=${character.id}`)
      return
    }
    const chat = await createChatMutation.mutateAsync({
      body: { characterIds: [character.id], placeId: place.id },
      userId: player.id,
    })
    rememberChatId(place.id, character.id, chat.id)
    navigate(`/chat/${chat.id}?placeId=${place.id}&characterId=${character.id}`)
  }

  const totalCharacters =
    location?.places.reduce((sum, p) => sum + p.characters.length, 0) ?? 0

  return (
    <div className="min-h-dvh p-4 sm:p-8">
      <header className="mx-auto max-w-6xl mb-6 flex items-center gap-3">
        <button className="btn-ghost" onClick={() => navigate('/map')}>
          {t.common.backToMap}
        </button>
        <LanguageSwitcher className="ml-auto" />
      </header>

      <section className="mx-auto max-w-6xl space-y-6">
        <TimeChanger />

        {isLoading && <LocationLoading />}

        {location && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="card p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-city-accent">
                {t.location.label} · {location.locale}
              </p>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold">
                {location.name}
              </h1>
              <p className="mt-2 text-sm text-city-muted whitespace-pre-wrap">
                {location.description}
              </p>
              <p className="mt-3 text-xs text-city-muted">
                {t.location.countsSummary({
                  places: location.places.length,
                  people: totalCharacters,
                })}
              </p>
            </div>

            {location.places.length === 0 && (
              <div className="card p-6 text-city-muted text-sm">
                {t.location.noPlaces}
              </div>
            )}

            {location.places.map((place) => (
              <article key={place.id} className="card p-5 sm:p-6">
                <header className="mb-4">
                  <h2 className="font-display text-xl font-semibold">
                    {place.name}
                  </h2>
                  <p className="text-sm text-city-muted whitespace-pre-wrap">
                    {place.description}
                  </p>
                </header>

                {place.characters.length === 0 ? (
                  <p className="text-sm text-city-muted">
                    {t.location.nobodyHere}
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {place.characters.map((character) => (
                      <NpcCard
                        key={character.id}
                        character={character}
                        onClick={() => openChat(character, place)}
                      />
                    ))}
                  </div>
                )}
              </article>
            ))}
          </motion.div>
        )}
      </section>
    </div>
  )
}
