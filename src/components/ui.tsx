import { useEffect, useState, type ReactNode } from 'react'

// ── Icons (stroke icons drawn at 20px, inherit text color) ───────────────

const paths = {
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M5 12l7 7 7-7',
  left: 'M19 12H5M12 5l-7 7 7 7',
  right: 'M5 12h14M12 5l7 7-7 7',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3',
  plus: 'M12 5v14M5 12h14',
  check: 'M4 12.5l5 5 11-11',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  pen: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 1 2-2h13',
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  )
}

export function IconButton({ icon, label, onClick, disabled }: { icon: IconName; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} onClick={onClick} disabled={disabled}>
      <Icon name={icon} />
    </button>
  )
}

/** A delete button that asks for confirmation inline (no browser dialogs). */
export function ConfirmDelete({ label, what, onConfirm }: { label: string; what: string; onConfirm: () => void }) {
  const [asking, setAsking] = useState(false)
  if (!asking) return <IconButton icon="trash" label={label} onClick={() => setAsking(true)} />
  return (
    <span className="confirm" role="group" aria-label={`Confirm: ${label}`}>
      <span>Delete {what}?</span>
      <button type="button" className="btn danger small" onClick={onConfirm}>Delete</button>
      <button type="button" className="btn small" onClick={() => setAsking(false)}>Keep</button>
    </span>
  )
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="empty-hint">{children}</p>
}

/** Floating "back to top" arrow that appears after scrolling down. */
export function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <button
      type="button"
      className={`to-top${visible ? ' visible' : ''}`}
      aria-label="Back to top"
      title="Back to top"
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })}
    >
      <Icon name="up" size={22} />
    </button>
  )
}
