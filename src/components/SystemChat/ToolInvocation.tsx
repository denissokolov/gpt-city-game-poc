import { useState } from 'react'
import {
  type DynamicToolUIPart,
  type ToolUIPart,
  getToolName,
  isToolUIPart,
  type UIMessagePart,
  type UIDataTypes,
  type UITools,
} from 'ai'
import { motion } from 'framer-motion'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

type AnyToolPart = ToolUIPart | DynamicToolUIPart

export function isAnyToolPart(
  part: UIMessagePart<UIDataTypes, UITools>,
): part is AnyToolPart {
  return part.type === 'dynamic-tool' || isToolUIPart(part)
}

/** Normalize an incoming tool name (snake_case / camelCase / kebab-case) to a
 * canonical kebab-case key suitable for translation lookup. */
function normalizeToolKey(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase()
}

/** Convert a snake_case or camelCase tool name to a readable label. */
function humanizeToolName(name: string): string {
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)(\w)/g, (_, sp, ch) => sp + ch.toUpperCase())
}

function localizeToolName(
  name: string,
  toolDict: Record<string, string>,
): string {
  const key = normalizeToolKey(name)
  return toolDict[key] ?? humanizeToolName(name)
}

type Status = 'running' | 'success' | 'error' | 'denied'

function statusFromState(state: AnyToolPart['state']): Status {
  switch (state) {
    case 'output-available':
      return 'success'
    case 'output-error':
      return 'error'
    case 'output-denied':
      return 'denied'
    default:
      return 'running'
  }
}

function formatJson(value: unknown): string {
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default function ToolInvocation({ part }: { part: AnyToolPart }) {
  const t = useT()
  const toolName = getToolName(part)
  const localizedName = localizeToolName(toolName, t.systemChat.tools)
  const status = statusFromState(part.state)
  const [open, setOpen] = useState(false)

  const inputText = formatJson(part.input)
  const outputText =
    status === 'success' && 'output' in part
      ? formatJson(part.output)
      : status === 'error' && 'errorText' in part
        ? part.errorText
        : ''

  const hasDetails = Boolean(inputText) || Boolean(outputText)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/[0.04] text-xs text-city-ink"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!hasDetails}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left',
          hasDetails ? 'hover:bg-white/[0.03] cursor-pointer' : 'cursor-default',
        )}
        aria-expanded={hasDetails ? open : undefined}
      >
        <StatusIcon status={status} />
        <span className="min-w-0 flex-1 truncate">
          <span className="text-city-muted">{statusVerb(status, t)} </span>
          <span className="font-medium text-city-ink">{localizedName}</span>
        </span>
        {hasDetails && (
          <ChevronIcon
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-city-muted transition-transform',
              open ? 'rotate-180' : '',
            )}
          />
        )}
      </button>

      {open && hasDetails && (
        <div className="space-y-2 border-t border-white/10 px-3 py-2">
          {inputText && (
            <ToolDetail label={t.systemChat.toolInput} text={inputText} />
          )}
          {outputText && (
            <ToolDetail
              label={
                status === 'error'
                  ? t.systemChat.toolError
                  : t.systemChat.toolOutput
              }
              text={outputText}
              tone={status === 'error' ? 'error' : 'default'}
            />
          )}
        </div>
      )}
    </motion.div>
  )
}

function statusVerb(status: Status, t: ReturnType<typeof useT>): string {
  switch (status) {
    case 'running':
      return t.systemChat.toolRunning
    case 'success':
      return t.systemChat.toolFinished
    case 'error':
      return t.systemChat.toolFailed
    case 'denied':
      return t.systemChat.toolDenied
  }
}

function ToolDetail({
  label,
  text,
  tone = 'default',
}: {
  label: string
  text: string
  tone?: 'default' | 'error'
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-city-muted">
        {label}
      </p>
      <pre
        className={cn(
          'max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md bg-black/30 px-2 py-1.5 font-mono text-[11px] leading-relaxed',
          tone === 'error' ? 'text-red-300/90' : 'text-city-ink/90',
        )}
      >
        {text}
      </pre>
    </div>
  )
}

function StatusIcon({ status }: { status: Status }) {
  if (status === 'running') {
    return (
      <span className="flex h-5 w-5 items-center justify-center" aria-hidden>
        <svg
          className="h-3.5 w-3.5 animate-spin text-city-accent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <path d="M21 12a9 9 0 0 1-9 9" />
        </svg>
      </span>
    )
  }
  if (status === 'success') {
    return (
      <span
        className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300"
        aria-hidden
      >
        <svg
          className="h-3 w-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12l5 5L20 7" />
        </svg>
      </span>
    )
  }
  return (
    <span
      className="flex h-5 w-5 items-center justify-center rounded-full bg-red-400/15 text-red-300"
      aria-hidden
    >
      <svg
        className="h-3 w-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </span>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
