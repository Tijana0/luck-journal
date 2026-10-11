import { Fragment, useState } from 'react'
import { useJournal } from '../store'
import { CATEGORY_COLORS, read, type Category } from '../types'
import { DebouncedField } from '../components/DebouncedField'
import { ConfirmDelete, EmptyHint, Icon, IconButton } from '../components/ui'
import type { BlockProps } from './types'

const Tick = () => <Icon name="check" size={18} />

export function ChallengeBlock({ block, items, mode }: BlockProps) {
  const { actions } = useJournal()
  const d = read.challenge(block.data)
  const categories = new Map(d.categories.map((c) => [c.id, c]))
  const taken = items.filter((i) => i.done).length
  const [count, setCount] = useState(30)

  if (mode === 'edit') {
    const setCategories = (next: Category[]) => actions.updateBlock(block.id, { data: { categories: next } })
    return (
      <div className="editor">
        <div className="field-grid">
          <label className="eyebrow" htmlFor={`${block.id}-note`}>Note prompt</label>
          <DebouncedField id={`${block.id}-note`} className="field" value={d.noteLabel} onCommit={(noteLabel) => actions.updateBlock(block.id, { data: { noteLabel } })} placeholder="What happened?" />
        </div>

        <fieldset className="sub">
          <legend className="eyebrow">Categories</legend>
          {d.categories.map((c, ci) => (
            <div className="row-edit" key={c.id}>
              <span className="swatch" data-c={c.color} aria-hidden="true" />
              <DebouncedField
                id={`${block.id}-cat-${c.id}`}
                className="field"
                value={c.label}
                label={`Category ${ci + 1} name`}
                onCommit={(label) => setCategories(d.categories.map((x) => (x.id === c.id ? { ...x, label } : x)))}
              />
              <select
                className="field select"
                aria-label={`Category ${ci + 1} color`}
                value={c.color}
                onChange={(e) => setCategories(d.categories.map((x) => (x.id === c.id ? { ...x, color: e.target.value as Category['color'] } : x)))}
              >
                {CATEGORY_COLORS.map((col) => <option key={col} value={col}>{col}</option>)}
              </select>
              <IconButton icon="trash" label={`Remove category ${c.label || ci + 1}`} onClick={() => setCategories(d.categories.filter((x) => x.id !== c.id))} />
            </div>
          ))}
          <button
            type="button"
            className="btn small"
            onClick={() =>
              setCategories([...d.categories, { id: crypto.randomUUID().slice(0, 8), label: 'New category', color: CATEGORY_COLORS[d.categories.length % CATEGORY_COLORS.length] }])
            }
          >
            <Icon name="plus" size={16} /> Category
          </button>
        </fieldset>

        <ol className="edit-list">
          {items.map((item, idx) => {
            const it = read.challengeItem(item.data)
            return (
              <li key={item.id} className="edit-row">
                <span className="num">{String(idx + 1).padStart(2, '0')}</span>
                <div className="edit-fields">
                  <DebouncedField id={`${item.id}-t`} className="field" value={it.title} placeholder="Goal (leave empty to fill in later)" label={`Item ${idx + 1} title`} onCommit={(title) => actions.updateItem(item.id, { data: { title } })} />
                  <DebouncedField id={`${item.id}-h`} className="field" value={it.how} placeholder="Details or tips (optional)" label={`Item ${idx + 1} details`} onCommit={(how) => actions.updateItem(item.id, { data: { how } })} />
                  <select className="field select" aria-label={`Item ${idx + 1} category`} value={it.category} onChange={(e) => actions.updateItem(item.id, { data: { category: e.target.value } })}>
                    <option value="">No category</option>
                    {d.categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="row-tools">
                  <IconButton icon="up" label="Move up" onClick={() => actions.moveItem(item.id, -1)} disabled={idx === 0} />
                  <IconButton icon="down" label="Move down" onClick={() => actions.moveItem(item.id, 1)} disabled={idx === items.length - 1} />
                  <ConfirmDelete label={`Delete item ${idx + 1}`} what="this item" onConfirm={() => actions.deleteItem(item.id)} />
                </div>
              </li>
            )
          })}
        </ol>

        <div className="row add-row">
          <button type="button" className="btn small" onClick={() => actions.addItems(block.id, [{ title: '', how: '', category: '', note: '' }])}>
            <Icon name="plus" size={16} /> Item
          </button>
          <span className="add-many">
            <label htmlFor={`${block.id}-count`}>or add</label>
            <input id={`${block.id}-count`} className="field num-input" type="number" min={1} max={100} value={count} onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} />
            <button type="button" className="btn small" onClick={() => actions.addItems(block.id, Array.from({ length: count }, () => ({ title: '', how: '', category: '', note: '' })))}>
              empty items
            </button>
          </span>
        </div>
      </div>
    )
  }

  if (items.length === 0) return <EmptyHint>No items yet. Switch to Edit to add some, for example 30 empty ones to fill in day by day.</EmptyHint>

  const isOpen = (data: Record<string, unknown>) => {
    const it = read.challengeItem(data)
    return !it.title && !it.how && !categories.has(it.category)
  }
  const firstBlank = items.findIndex((i) => isOpen(i.data))
  const showDivider = firstBlank > 0

  return (
    <>
      <div className="progress">
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${(taken / items.length) * 100}%` }} />
        </div>
        <span className="count">
          {taken} / {items.length} done
        </span>
      </div>

      {d.categories.length > 0 && (
        <div className="legend">
          {d.categories.map((c) => (
            <span key={c.id}>
              <i className="swatch" data-c={c.color} />
              {c.label}
            </span>
          ))}
        </div>
      )}

      <ol className="entries">
        {items.map((item, idx) => {
          const it = read.challengeItem(item.data)
          const cat = categories.get(it.category)
          const open = isOpen(item.data)
          return (
            <Fragment key={item.id}>
              {showDivider && idx === firstBlank && (
                <li className="divider" aria-hidden="true">
                  …the rest is still unwritten
                </li>
              )}
              <li className={`entry${item.done ? ' done' : ''}${open ? ' blank' : ''}`}>
                <div className="num">
                  {String(idx + 1).padStart(2, '0')}
                  <button type="button" className="check" aria-pressed={item.done} aria-label={`Mark item ${idx + 1} as done`} onClick={() => actions.updateItem(item.id, { done: !item.done })}>
                    <Tick />
                  </button>
                </div>
                <div className="body">
                  {open ? (
                    <DebouncedField id={`${item.id}-title`} className="blank-input" value={it.title} placeholder="Next one…" label={`Item ${idx + 1}`} onCommit={(title) => actions.updateItem(item.id, { data: { title } })} />
                  ) : (
                    <>
                      {cat && <span className="tag" data-c={cat.color}>{cat.label}</span>}
                      {it.title && <h3>{it.title}</h3>}
                      {it.how && <p className="how">{it.how}</p>}
                    </>
                  )}
                  <DebouncedField id={`${item.id}-note`} className="result" value={it.note} placeholder={d.noteLabel} label={`${d.noteLabel} (item ${idx + 1})`} onCommit={(note) => actions.updateItem(item.id, { data: { note } })} />
                </div>
              </li>
            </Fragment>
          )
        })}
      </ol>
    </>
  )
}
