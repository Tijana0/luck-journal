import { useEffect, useRef, useState } from 'react'

interface Props {
  id: string
  value: string
  onCommit: (value: string) => void
  placeholder?: string
  className?: string
  multiline?: boolean
  label?: string
  delay?: number
}

/**
 * A text field that keeps typing snappy by holding the value locally and
 * saving it a moment after the person stops typing (and immediately on blur).
 */
export function DebouncedField({ id, value, onCommit, placeholder, className, multiline, label, delay = 700 }: Props) {
  const [draft, setDraft] = useState(value)
  const lastSaved = useRef(value)
  const timer = useRef<number | undefined>(undefined)

  // Pick up changes that came from elsewhere (e.g. a reload) when not mid-edit.
  useEffect(() => {
    if (value !== lastSaved.current) {
      lastSaved.current = value
      setDraft(value)
    }
  }, [value])

  const flush = (next: string) => {
    window.clearTimeout(timer.current)
    if (next !== lastSaved.current) {
      lastSaved.current = next
      onCommit(next)
    }
  }

  const onChange = (next: string) => {
    setDraft(next)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => flush(next), delay)
  }

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const common = {
    id,
    className,
    placeholder,
    value: draft,
    'aria-label': label,
    onBlur: () => flush(draft),
  }

  return multiline ? (
    <textarea {...common} onChange={(e) => onChange(e.target.value)} />
  ) : (
    <input {...common} onChange={(e) => onChange(e.target.value)} />
  )
}
