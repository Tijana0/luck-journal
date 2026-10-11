import { Fragment, type ReactNode } from 'react'

/**
 * A tiny, safe formatter for text blocks: blank lines split paragraphs,
 * lines starting with "- " become bullets, and **double stars** make bold.
 * Everything is rendered as React text, so nothing is interpreted as HTML.
 */
function inline(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  )
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const groups = text.trim().split(/\n\s*\n/)
  return (
    <div className={className}>
      {groups.map((group, gi) => {
        const lines = group.split('\n')
        const nodes: ReactNode[] = []
        let bullets: string[] = []
        const flush = () => {
          if (bullets.length) {
            nodes.push(
              <ul key={`u${nodes.length}`} className="plain">
                {bullets.map((b, bi) => <li key={bi}>{inline(b)}</li>)}
              </ul>,
            )
            bullets = []
          }
        }
        let para: string[] = []
        const flushPara = () => {
          if (para.length) {
            nodes.push(<p key={`p${nodes.length}`}>{para.flatMap((l, li) => (li ? [<br key={`b${li}`} />, ...inline(l)] : inline(l)))}</p>)
            para = []
          }
        }
        for (const line of lines) {
          const m = /^\s*[-*•]\s+(.*)$/.exec(line)
          if (m) {
            flushPara()
            bullets.push(m[1])
          } else {
            flush()
            para.push(line)
          }
        }
        flushPara()
        flush()
        return <Fragment key={gi}>{nodes}</Fragment>
      })}
    </div>
  )
}
