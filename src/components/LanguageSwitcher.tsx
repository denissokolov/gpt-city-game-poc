import { useGameStore, UI_LANGUAGES, type UiLanguage } from '@/game/store'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

type Props = {
  className?: string
}

export function LanguageSwitcher({ className }: Props) {
  const t = useT()
  const value = useGameStore((s) => s.uiLanguage)
  const setUiLanguage = useGameStore((s) => s.setUiLanguage)

  return (
    <div
      role="radiogroup"
      aria-label={t.language.label}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-0.5',
        className,
      )}
    >
      {UI_LANGUAGES.map((lang: UiLanguage) => {
        const isActive = lang === value
        return (
          <button
            key={lang}
            type="button"
            role="radio"
            aria-checked={isActive}
            title={t.language.name[lang]}
            onClick={() => {
              if (!isActive) setUiLanguage(lang)
            }}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
              isActive
                ? 'bg-city-accent text-slate-900'
                : 'text-city-muted hover:text-city-ink',
            )}
          >
            {t.language.short[lang]}
          </button>
        )
      })}
    </div>
  )
}

export default LanguageSwitcher
