import { useRef, useState, type ChangeEvent } from 'react'
import { useJournal } from '../store'
import { TEMPLATES } from '../templates'
import { LayoutError, parseLayout, stateToLayout, type Layout } from '../layout'
import { BLOCK_INFO } from '../types'
import { Icon } from './ui'

function summary(layout: Layout): string {
  return layout.pages
    .map((p) => (p.blocks.length ? `${p.title} (${p.blocks.map((b) => BLOCK_INFO[b.type].name.toLowerCase()).join(', ')})` : p.title))
    .join(' · ')
}

/** Read a chosen file and hand back a parsed layout, or an error message. */
async function readLayoutFile(e: ChangeEvent<HTMLInputElement>): Promise<Layout | string> {
  const file = e.target.files?.[0]
  e.target.value = '' // let the same file be picked again later
  if (!file) return 'No file chosen.'
  try {
    return parseLayout(await file.text())
  } catch (err) {
    return err instanceof LayoutError ? err.message : 'That file couldn’t be read.'
  }
}

// ── First run: pick a starting point ─────────────────────────────────────

export function Onboarding({ onDone }: { onDone: (firstPageId: string | undefined) => void }) {
  const { actions } = useJournal()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const result = await readLayoutFile(e)
    if (typeof result === 'string') return setError(result)
    setError('')
    onDone(actions.importLayout(result, { useHeader: true }))
  }

  return (
    <section className="onboarding" aria-labelledby="onboarding-title">
      <h2 id="onboarding-title">How do you want to start?</h2>
      <p className="lede">Pick a starting layout. You can rename, rearrange and add to everything afterwards in Edit mode.</p>
      <div className="template-grid">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" className="template" onClick={() => onDone(actions.importLayout(t.layout, { useHeader: true }))}>
            <strong>{t.name}</strong>
            <span>{t.description}</span>
            <small>{summary(t.layout)}</small>
          </button>
        ))}
        <button type="button" className="template import" onClick={() => fileRef.current?.click()}>
          <strong>
            <Icon name="upload" size={16} /> Import a layout file
          </strong>
          <span>Recreate a journal from a file you exported earlier.</span>
          <small>.json file</small>
        </button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  )
}

// ── Edit mode: journal-wide tools ────────────────────────────────────────

export function JournalTools({ onPagesAdded }: { onPagesAdded: (firstPageId: string | undefined) => void }) {
  const { state, actions } = useJournal()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [templateId, setTemplateId] = useState(TEMPLATES[1]?.id ?? TEMPLATES[0].id)
  const [confirmReset, setConfirmReset] = useState(false)

  const exportLayout = () => {
    const blob = new Blob([JSON.stringify(stateToLayout(state), null, 2) + '\n'], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journal-layout-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setNotice('Layout exported. Keep the file somewhere private, it includes what you wrote.')
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const result = await readLayoutFile(e)
    if (typeof result === 'string') {
      setNotice('')
      return setError(result)
    }
    setError('')
    onPagesAdded(actions.importLayout(result, { useHeader: false }))
    setNotice(`Added ${result.pages.length === 1 ? '1 page' : `${result.pages.length} pages`} from the file.`)
  }

  const addTemplate = () => {
    const t = TEMPLATES.find((x) => x.id === templateId)
    if (!t) return
    onPagesAdded(actions.importLayout(t.layout, { useHeader: false }))
    setNotice(`Added the pages from "${t.name}".`)
  }

  return (
    <section className="card tools" aria-labelledby="tools-title">
      <h2 id="tools-title">Journal tools</h2>
      <div className="tools-grid">
        <div>
          <h3>Back up or move</h3>
          <p>Export saves your whole journal, layout and writing, as a file. Import adds the pages from such a file.</p>
          <div className="row">
            <button type="button" className="btn" onClick={exportLayout}>
              <Icon name="download" size={16} /> Export layout
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={16} /> Import layout
            </button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>
        <div>
          <h3>Add pages from a template</h3>
          <p>Adds the template's pages after your current ones. Nothing is replaced.</p>
          <div className="row">
            <label htmlFor="template-pick" className="visually-hidden">Template</label>
            <select id="template-pick" className="field select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button type="button" className="btn" onClick={addTemplate}>
              <Icon name="plus" size={16} /> Add
            </button>
          </div>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      <div className="danger-zone">
        <h3>Start over</h3>
        <p>Deletes every page and everything written in them, then shows the starting layouts again. Export first if you want to keep a copy.</p>
        {confirmReset ? (
          <div className="row" role="group" aria-label="Confirm start over">
            <span className="confirm">Delete the whole journal?</span>
            <button type="button" className="btn danger small" onClick={() => actions.resetJournal()}>
              Delete everything
            </button>
            <button type="button" className="btn small" onClick={() => setConfirmReset(false)}>
              Keep my journal
            </button>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => setConfirmReset(true)}>
            <Icon name="trash" size={16} /> Start over
          </button>
        )}
      </div>
    </section>
  )
}
