import { useJournal } from '../store'
import { read, type IdeaSection } from '../types'
import { DebouncedField } from '../components/DebouncedField'
import { ConfirmDelete, EmptyHint, Icon, IconButton } from '../components/ui'
import type { BlockProps } from './types'

export function IdeasBlock({ block, items, mode }: BlockProps) {
  const { actions } = useJournal()

  if (mode === 'edit') {
    return (
      <div className="editor">
        {items.map((item, idx) => {
          const idea = read.ideaItem(item.data)
          const setSections = (sections: IdeaSection[]) => actions.updateItem(item.id, { data: { sections } })
          return (
            <div key={item.id} className="idea-edit">
              <div className="idea-edit-head">
                <span className="eyebrow">Idea {idx + 1}</span>
                <div className="row-tools">
                  <IconButton icon="up" label="Move up" onClick={() => actions.moveItem(item.id, -1)} disabled={idx === 0} />
                  <IconButton icon="down" label="Move down" onClick={() => actions.moveItem(item.id, 1)} disabled={idx === items.length - 1} />
                  <ConfirmDelete label={`Delete idea ${idea.title || idx + 1}`} what="this idea" onConfirm={() => actions.deleteItem(item.id)} />
                </div>
              </div>
              <DebouncedField id={`${item.id}-t`} className="field" value={idea.title} placeholder="Name of the idea" label={`Idea ${idx + 1} name`} onCommit={(title) => actions.updateItem(item.id, { data: { title } })} />
              <DebouncedField id={`${item.id}-st`} className="field" value={idea.status} placeholder="Status, e.g. Exploring" label={`Idea ${idx + 1} status`} onCommit={(status) => actions.updateItem(item.id, { data: { status } })} />
              <DebouncedField id={`${item.id}-su`} className="field" multiline value={idea.summary} placeholder="In a sentence or two: who is it for, and what does it do?" label={`Idea ${idx + 1} summary`} onCommit={(summary) => actions.updateItem(item.id, { data: { summary } })} />
              {idea.sections.map((s, si) => (
                <div key={si} className="section-edit">
                  <DebouncedField
                    id={`${item.id}-sh-${si}`}
                    className="field"
                    value={s.heading}
                    placeholder="Section heading, e.g. Next step"
                    label={`Section ${si + 1} heading`}
                    onCommit={(heading) => setSections(read.ideaItem(item.data).sections.map((x, k) => (k === si ? { ...x, heading } : x)))}
                  />
                  <DebouncedField
                    id={`${item.id}-sx-${si}`}
                    className="field"
                    multiline
                    value={s.text}
                    placeholder="Section text"
                    label={`Section ${si + 1} text`}
                    onCommit={(text) => setSections(read.ideaItem(item.data).sections.map((x, k) => (k === si ? { ...x, text } : x)))}
                  />
                  <IconButton icon="trash" label={`Remove section ${si + 1}`} onClick={() => setSections(idea.sections.filter((_, k) => k !== si))} />
                </div>
              ))}
              <button type="button" className="btn small" onClick={() => setSections([...idea.sections, { heading: '', text: '' }])}>
                <Icon name="plus" size={16} /> Section
              </button>
            </div>
          )
        })}
        <button type="button" className="btn small" onClick={() => actions.addItems(block.id, [{ title: '', status: 'New', summary: '', sections: [] }])}>
          <Icon name="plus" size={16} /> Idea
        </button>
      </div>
    )
  }

  if (items.length === 0) return <EmptyHint>No ideas yet. Switch to Edit to add your first one.</EmptyHint>

  return (
    <div className="ideas">
      {items.map((item) => {
        const idea = read.ideaItem(item.data)
        return (
          <article key={item.id} className="idea">
            {idea.status && <span className="status">{idea.status}</span>}
            <h3 className="idea-title">{idea.title || 'Untitled idea'}</h3>
            {idea.summary && <p>{idea.summary}</p>}
            {idea.sections.length > 0 && (
              <div className="split">
                {idea.sections.map((s, i) => (
                  <div key={i}>
                    {s.heading && <h4>{s.heading}</h4>}
                    <p>{s.text}</p>
                  </div>
                ))}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
