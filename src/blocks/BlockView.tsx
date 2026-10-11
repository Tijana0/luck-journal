import type { ComponentType } from 'react'
import { useJournal } from '../store'
import { BLOCK_INFO, type Block, type BlockType, type Item, type Mode } from '../types'
import { DebouncedField } from '../components/DebouncedField'
import { ConfirmDelete, IconButton } from '../components/ui'
import { ChallengeBlock } from './ChallengeBlock'
import { HabitsBlock } from './HabitsBlock'
import { IdeasBlock } from './IdeasBlock'
import { ChecklistBlock, FactsBlock, NotesBlock, TextBlock } from './SimpleBlocks'
import type { BlockProps } from './types'

const RENDERERS: Record<BlockType, ComponentType<BlockProps>> = {
  challenge: ChallengeBlock,
  habits: HabitsBlock,
  ideas: IdeasBlock,
  notes: NotesBlock,
  checklist: ChecklistBlock,
  facts: FactsBlock,
  text: TextBlock,
}

interface Props {
  block: Block
  items: Item[]
  mode: Mode
  isFirst: boolean
  isLast: boolean
}

/** A block on the page: its title, its edit toolbar in Edit mode, and its body. */
export function BlockView({ block, items, mode, isFirst, isLast }: Props) {
  const { actions } = useJournal()
  const Body = RENDERERS[block.type]
  const info = BLOCK_INFO[block.type]
  // Challenge lists and habit trackers are long lists; they sit on the page
  // without an outer card so each row can be its own card.
  const bare = mode === 'write' && (block.type === 'challenge' || block.type === 'habits')

  return (
    <section className={`block block-${block.type}${mode === 'edit' ? ' editing' : ''}${bare ? ' bare' : ''}`} aria-label={block.title || info.name}>
      {mode === 'edit' ? (
        <header className="block-toolbar">
          <span className="type-badge">{info.name}</span>
          <DebouncedField
            id={`${block.id}-title`}
            className="field title-input"
            value={block.title}
            placeholder="Block title (optional)"
            label={`${info.name} title`}
            onCommit={(title) => actions.updateBlock(block.id, { title })}
          />
          <div className="row-tools">
            <IconButton icon="up" label="Move block up" onClick={() => actions.moveBlock(block.id, -1)} disabled={isFirst} />
            <IconButton icon="down" label="Move block down" onClick={() => actions.moveBlock(block.id, 1)} disabled={isLast} />
            <ConfirmDelete label={`Delete ${info.name.toLowerCase()} block`} what="this block and everything in it" onConfirm={() => actions.deleteBlock(block.id)} />
          </div>
        </header>
      ) : (
        block.title && <h2 className="block-title">{block.title}</h2>
      )}
      <Body block={block} items={items} mode={mode} />
    </section>
  )
}
