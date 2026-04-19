import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

interface StreamingTextProps {
  text: string
  streaming?: boolean
  /** Minimum characters per second when there's little backlog. */
  baseCps?: number
  /** Show a blinking caret while text is still being revealed. */
  showCaret?: boolean
  className?: string
}

/**
 * Reveals streamed text character-by-character using requestAnimationFrame so
 * the visible animation stays smooth even when the underlying SSE chunks arrive
 * in unevenly sized bursts. The reveal speed adapts to the backlog so it never
 * falls noticeably behind the stream.
 */
export default function StreamingText({
  text,
  streaming = false,
  baseCps = 45,
  showCaret = true,
  className,
}: StreamingTextProps) {
  const [displayed, setDisplayed] = useState(() => (streaming ? '' : text))
  const lenRef = useRef<number>(streaming ? 0 : text.length)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  useEffect(() => {
    if (text.length < lenRef.current) {
      lenRef.current = 0
      setDisplayed('')
    }

    if (!streaming && lenRef.current === 0) {
      lenRef.current = text.length
      setDisplayed(text)
      return
    }

    if (lenRef.current >= text.length && !streaming) {
      return
    }

    const tick = (now: number) => {
      const prev = lastTimeRef.current || now
      const dt = Math.min(0.1, (now - prev) / 1000)
      lastTimeRef.current = now

      const backlog = text.length - lenRef.current
      if (backlog > 0) {
        const cps = Math.max(baseCps, backlog / 0.6)
        const step = Math.max(1, Math.round(cps * dt))
        lenRef.current = Math.min(text.length, lenRef.current + step)
        setDisplayed(text.slice(0, lenRef.current))
      }

      if (lenRef.current < text.length || streaming) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        rafRef.current = null
        lastTimeRef.current = 0
      }
    }

    if (rafRef.current == null) {
      lastTimeRef.current = 0
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      lastTimeRef.current = 0
    }
  }, [text, streaming, baseCps])

  const caretVisible = showCaret && (streaming || displayed.length < text.length)

  return (
    <span className={className}>
      {displayed}
      {caretVisible && (
        <span
          className={cn(
            'inline-block align-[-0.15em] ml-[1px] w-[2px] h-[1em]',
            'bg-current opacity-70 animate-pulse rounded-[1px]',
          )}
          aria-hidden="true"
        />
      )}
    </span>
  )
}
