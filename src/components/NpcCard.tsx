import { motion } from 'framer-motion'
import type { CharacterDto } from '@/api/client'
import type { PlayerSex } from '@/game/store'
import { npcAvatarUrl } from '@/game/avatars'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

type Props = {
  character: CharacterDto
  onClick?: () => void
  compact?: boolean
}

export function NpcCard({ character, onClick, compact }: Props) {
  const t = useT()
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'card group flex w-full text-left gap-4 p-4 hover:border-city-accent/40 transition-colors',
        onClick ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <img
        src={npcAvatarUrl(character)}
        alt={`${character.firstName} ${character.lastName}`}
        className="h-16 w-16 shrink-0 rounded-full border border-white/10 bg-white/5"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-lg font-semibold text-city-ink truncate">
            {character.firstName} {character.lastName}
          </h3>
          <span className="text-xs text-city-muted shrink-0">
            {character.age} · {t.sex[character.sex as PlayerSex]}
          </span>
        </div>
        <p className="text-sm text-city-accent/90">{character.title}</p>
        {!compact && (
          <p className="mt-1 text-sm text-city-muted line-clamp-2">
            {character.personality}
          </p>
        )}
      </div>
    </motion.button>
  )
}
