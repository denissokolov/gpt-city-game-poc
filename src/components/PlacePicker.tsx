import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import type { CharacterDto, PlaceDto } from '@/api/client'
import { npcAvatarUrl } from '@/game/avatars'

type Props = {
  open: boolean
  character: CharacterDto | null
  places: PlaceDto[]
  onPick: (place: PlaceDto) => void
  onClose: () => void
}

export function PlacePicker({ open, character, places, onPick, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && character && (
        <motion.div
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="card w-full max-w-xl p-5"
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <img
                src={npcAvatarUrl(character)}
                alt=""
                className="h-12 w-12 rounded-full border border-white/10"
              />
              <div>
                <h2 className="font-display text-lg font-semibold">
                  Where do you want to meet {character.firstName}?
                </h2>
                <p className="text-sm text-city-muted">
                  Pick a spot in this location.
                </p>
              </div>
            </div>

            <ul className="mt-4 grid gap-2 max-h-[60vh] overflow-y-auto pr-1 scroll-fade">
              {places.length === 0 && (
                <li className="text-sm text-city-muted">
                  No places available here yet.
                </li>
              )}
              {places.map((p) => (
                <li key={p.id}>
                  <button
                    className="w-full text-left rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] hover:border-city-accent/40 transition-colors"
                    onClick={() => onPick(p)}
                  >
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-sm text-city-muted line-clamp-2">
                      {p.description}
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex justify-end">
              <button className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
