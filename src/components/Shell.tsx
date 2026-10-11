import { useState } from 'react'
import { useJournal, blocksOf, itemsOf } from '../store'
import { BLOCK_INFO, BLOCK_ORDER, type Mode, type Page } from '../types'
import { BlockView } from '../blocks/BlockView'
import { DebouncedField } from './DebouncedField'
import { ConfirmDelete, EmptyHint, Icon, IconButton } from './ui'

// ── Journal header ───────────────────────────────────────────────────────

export function JournalHeader({ mode }: { mode: Mode }) {
  const { state, actions } = useJournal()
  const s = state.settings
  if (mode === 'edit') {
    return (
      <div className="header-edit">
        <DebouncedField id="journal-eyebrow" className="field eyebrow-input" value={s.eyebrow} placeholder="Small line above the title (optional)" label="Line above the title" onCommit={(eyebrow) => actions.updateSettings({ eyebrow })} />
        <DebouncedField id="journal-title" className="field title-big" value={s.title} placeholder="Journal title" label="Journal title" onCommit={(title) => actions.updateSettings({ title })} />
        <DebouncedField id="journal-subtitle" className="field" value={s.subtitle} placeholder="One line about what this journal is for (optional)" label="Subtitle" onCommit={(subtitle) => actions.updateSettings({ subtitle })} />
      </div>
    )
  }
  return (
    <>
      {s.eyebrow && <span className="eyebrow">{s.eyebrow}</span>}
      <h1>
        <mark>{s.title || 'My journal'}</mark>
      </h1>
      {s.subtitle && <p className="lede">{s.subtitle}</p>}
    </>
  )
}

// ── Page tabs ────────────────────────────────────────────────────────────

interface TabsProps {
  pages: Page[]
  activeId: string
  mode: Mode
  onSelect: (id: string) => void
}

export function PageTabs({ pages, activeId, mode, onSelect }: TabsProps) {
  const { actions } = useJournal()
  const active = pages.find((p) => p.id === activeId)
  const index = pages.findIndex((p) => p.id === activeId)

  return (
    <div className="tabs-wrap">
      <nav role="tablist" aria-label="Pages" className="tabs">
        {pages.map((p) => (
          <button key={p.id} type="button" role="tab" id={`tab-${p.id}`} aria-controls="page-panel" aria-selected={p.id === activeId} onClick={() => onSelect(p.id)}>
            {p.title || 'Untitled'}
          </button>
        ))}
        {mode === 'edit' && (
          <button type="button" className="tab-add" onClick={() => onSelect(actions.addPage())}>
            <Icon name="plus" size={16} /> Page
          </button>
        )}
      </nav>

      {mode === 'edit' && active && (
        <div className="page-toolbar">
          <label className="eyebrow" htmlFor={`page-title-${active.id}`}>Page name</label>
          <div className="page-toolbar-row">
            <DebouncedField key={active.id} id={`page-title-${active.id}`} className="field" value={active.title} placeholder="Page name" onCommit={(title) => actions.renamePage(active.id, title)} />
            <div className="row-tools">
              <IconButton icon="left" label="Move page left" onClick={() => actions.movePage(active.id, -1)} disabled={index <= 0} />
              <IconButton icon="right" label="Move page right" onClick={() => actions.movePage(active.id, 1)} disabled={index === pages.length - 1} />
              <ConfirmDelete
                label="Delete page"
                what={`"${active.title || 'Untitled'}" and all its blocks`}
                onConfirm={() => {
                  const next = pages[index + 1] ?? pages[index - 1]
                  actions.deletePage(active.id)
                  if (next) onSelect(next.id)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page body ────────────────────────────────────────────────────────────

export function PageView({ pageId, mode, onEdit }: { pageId: string; mode: Mode; onEdit: () => void }) {
  const { state, actions } = useJournal()
  const blocks = blocksOf(state, pageId)
  const [picking, setPicking] = useState(false)

  return (
    <div id="page-panel" role="tabpanel" aria-labelledby={`tab-${pageId}`} className="page">
      {blocks.length === 0 && mode === 'write' && (
        <div className="card empty-page">
          <h2>This page is empty</h2>
          <p>Switch to Edit to add blocks like a challenge list, a habit tracker or notes.</p>
          <button type="button" className="btn primary" onClick={onEdit}>
            <Icon name="pen" size={16} /> Edit this page
          </button>
        </div>
      )}

      {blocks.map((b, i) => (
        <BlockView key={b.id} block={b} items={itemsOf(state, b.id)} mode={mode} isFirst={i === 0} isLast={i === blocks.length - 1} />
      ))}

      {mode === 'edit' && (
        <div className="add-block">
          {picking ? (
            <>
              <div className="add-block-head">
                <h2>Add a block</h2>
                <button type="button" className="btn small" onClick={() => setPicking(false)}>Cancel</button>
              </div>
              <div className="block-picker">
                {BLOCK_ORDER.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="block-option"
                    onClick={() => {
                      actions.addBlock(pageId, type)
                      setPicking(false)
                    }}
                  >
                    <strong>{BLOCK_INFO[type].name}</strong>
                    <span>{BLOCK_INFO[type].description}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <button type="button" className="btn ghost" onClick={() => setPicking(true)}>
              <Icon name="plus" size={16} /> Add a block
            </button>
          )}
        </div>
      )}

      {mode === 'write' && blocks.length > 0 && blocks.every((b) => b.type === 'text' && !b.data.body) && <EmptyHint>Nothing written here yet.</EmptyHint>}
    </div>
  )
}
