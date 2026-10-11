import { useState, type FormEvent } from 'react'
import { useJournal } from '../store'
import { read } from '../types'
import { RichText } from '../text'
import { DebouncedField } from '../components/DebouncedField'
import { EmptyHint, Icon, IconButton } from '../components/ui'
import type { BlockProps } from './types'

// ── Notes ────────────────────────────────────────────────────────────────

export function NotesBlock({ block, mode }: BlockProps) {
  const { actions } = useJournal()
  const d = read.notes(block.data)
  return (
    <>
      {mode === 'edit' && (
        <div className="editor field-grid">
          <label className="eyebrow" htmlFor={`${block.id}-intro`}>Intro (optional)</label>
          <DebouncedField id={`${block.id}-intro`} className="field" value={d.intro} placeholder="A line above the notes" onCommit={(intro) => actions.updateBlock(block.id, { data: { intro } })} />
          <label className="eyebrow" htmlFor={`${block.id}-ph`}>Placeholder</label>
          <DebouncedField id={`${block.id}-ph`} className="field" value={d.placeholder} placeholder="Shown while the notes are empty" onCommit={(placeholder) => actions.updateBlock(block.id, { data: { placeholder } })} />
        </div>
      )}
      {mode === 'write' && d.intro && <p className="block-intro">{d.intro}</p>}
      <DebouncedField
        id={`${block.id}-body`}
        multiline
        className="notes"
        value={d.body}
        placeholder={d.placeholder || 'Write here…'}
        label={block.title || 'Notes'}
        onCommit={(body) => actions.updateBlock(block.id, { data: { body } })}
      />
    </>
  )
}

// ── Checklist ────────────────────────────────────────────────────────────

export function ChecklistBlock({ block, items, mode }: BlockProps) {
  const { actions } = useJournal()
  const [draft, setDraft] = useState('')

  const add = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    actions.addItems(block.id, [{ text }])
    setDraft('')
  }

  const open = items.filter((i) => !i.done).length

  return (
    <>
      {mode === 'write' && items.length > 0 && <p className="count small-count">{open === 0 ? 'All done' : `${open} left`}</p>}
      <ul className="checklist">
        {items.map((item, idx) => {
          const it = read.checklistItem(item.data)
          return (
            <li key={item.id} className={item.done ? 'done' : ''}>
              <button type="button" className="check small" aria-pressed={item.done} aria-label={`Mark "${it.text || 'item'}" as done`} onClick={() => actions.updateItem(item.id, { done: !item.done })}>
                <Icon name="check" size={14} />
              </button>
              {mode === 'edit' ? (
                <>
                  <DebouncedField id={`${item.id}-x`} className="field" value={it.text} label={`To-do ${idx + 1}`} onCommit={(text) => actions.updateItem(item.id, { data: { text } })} />
                  <div className="row-tools">
                    <IconButton icon="up" label="Move up" onClick={() => actions.moveItem(item.id, -1)} disabled={idx === 0} />
                    <IconButton icon="down" label="Move down" onClick={() => actions.moveItem(item.id, 1)} disabled={idx === items.length - 1} />
                    <IconButton icon="trash" label="Delete to-do" onClick={() => actions.deleteItem(item.id)} />
                  </div>
                </>
              ) : (
                <span className="check-text">{it.text}</span>
              )}
            </li>
          )
        })}
      </ul>
      <form className="quick-add" onSubmit={add}>
        <label htmlFor={`${block.id}-new`} className="visually-hidden">Add a to-do</label>
        <input id={`${block.id}-new`} className="field" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a to-do and press Enter" />
        <button type="submit" className="btn small" disabled={!draft.trim()}>Add</button>
      </form>
    </>
  )
}

// ── Key facts ────────────────────────────────────────────────────────────

export function FactsBlock({ block, mode }: BlockProps) {
  const { actions } = useJournal()
  const { facts } = read.facts(block.data)
  const save = (next: typeof facts) => actions.updateBlock(block.id, { data: { facts: next } })

  if (mode === 'edit') {
    return (
      <div className="editor">
        {facts.map((f, i) => (
          <div key={i} className="row-edit">
            <DebouncedField id={`${block.id}-l-${i}`} className="field" value={f.label} placeholder="Label, e.g. Starts" label={`Fact ${i + 1} label`} onCommit={(label) => save(read.facts(block.data).facts.map((x, k) => (k === i ? { ...x, label } : x)))} />
            <DebouncedField id={`${block.id}-v-${i}`} className="field" value={f.value} placeholder="Value, e.g. In two weeks" label={`Fact ${i + 1} value`} onCommit={(value) => save(read.facts(block.data).facts.map((x, k) => (k === i ? { ...x, value } : x)))} />
            <IconButton icon="trash" label={`Remove fact ${i + 1}`} onClick={() => save(facts.filter((_, k) => k !== i))} />
          </div>
        ))}
        <button type="button" className="btn small" onClick={() => save([...facts, { label: '', value: '' }])}>
          <Icon name="plus" size={16} /> Fact
        </button>
      </div>
    )
  }

  if (facts.length === 0) return <EmptyHint>No facts yet. Switch to Edit to add a few labels and values.</EmptyHint>
  return (
    <dl className="facts">
      {facts.map((f, i) => (
        <div key={i}>
          <dt>{f.label}</dt>
          <dd>{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}

// ── Text ─────────────────────────────────────────────────────────────────

export function TextBlock({ block, mode }: BlockProps) {
  const { actions } = useJournal()
  const { body } = read.text(block.data)
  if (mode === 'edit') {
    return (
      <div className="editor field-grid">
        <label className="eyebrow" htmlFor={`${block.id}-body`}>Text</label>
        <DebouncedField id={`${block.id}-body`} multiline className="field textarea" value={body} placeholder="Write a paragraph. Start lines with - for bullets, wrap words in **stars** for bold." onCommit={(next) => actions.updateBlock(block.id, { data: { body: next } })} />
        <p className="hint">Blank line = new paragraph · "- " = bullet · **bold**</p>
      </div>
    )
  }
  if (!body.trim()) return <EmptyHint>This text block is empty. Switch to Edit to write something.</EmptyHint>
  return <RichText text={body} className="rich" />
}

