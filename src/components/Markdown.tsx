import { memo } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/cn'

interface MarkdownProps {
  text: string
  className?: string
}

const components: Components = {
  p: ({ children }) => (
    <p className="my-2 first:mt-0 last:mb-0 leading-relaxed">{children}</p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-city-accent underline underline-offset-2 hover:opacity-90"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc pl-5 space-y-1 first:mt-0 last:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal pl-5 space-y-1 first:mt-0 last:mb-0">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h1 className="my-2 font-display text-base font-semibold first:mt-0 last:mb-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="my-2 font-display text-base font-semibold first:mt-0 last:mb-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="my-2 font-display text-sm font-semibold first:mt-0 last:mb-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="my-2 font-display text-sm font-semibold first:mt-0 last:mb-0">
      {children}
    </h4>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-white/20 pl-3 text-city-muted first:mt-0 last:mb-0">
      {children}
    </blockquote>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = /\blanguage-/.test(className ?? '')
    if (isBlock) {
      return (
        <code
          className={cn(
            'block whitespace-pre overflow-x-auto rounded-md bg-black/30 px-2 py-1.5 text-[0.85em] font-mono',
            className,
          )}
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        className="rounded bg-black/30 px-1 py-px text-[0.9em] font-mono"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto first:mt-0 last:mb-0">{children}</pre>
  ),
  hr: () => <hr className="my-3 border-white/10" />,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto first:mt-0 last:mb-0">
      <table className="min-w-full border-collapse text-left text-[0.95em]">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-white/15 px-2 py-1 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-white/5 px-2 py-1">{children}</td>
  ),
}

function MarkdownInner({ text, className }: MarkdownProps) {
  return (
    <div className={cn('break-words', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  )
}

const Markdown = memo(MarkdownInner)

export default Markdown
