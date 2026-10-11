import {
  BLOCK_ORDER,
  helpers,
  read,
  type Block,
  type BlockType,
  type Item,
  type JournalState,
  type Page,
  type Settings,
} from './types'

/**
 * A layout is a portable description of a journal: its header, pages and
 * blocks, optionally with content. Templates are layouts, "Import layout"
 * reads one, and "Export layout" writes one (also handy as a backup).
 */
export interface Layout {
  format: 'journal-layout'
  version: 1
  journal?: Partial<Settings>
  pages: LayoutPage[]
}

export interface LayoutPage {
  title: string
  blocks: LayoutBlock[]
}

export interface LayoutBlock {
  type: BlockType
  title?: string
  [key: string]: unknown
}

const { str, num, arr, obj } = helpers

export class LayoutError extends Error {}

/** Parse and sanity-check a layout file. Throws LayoutError with a readable message. */
export function parseLayout(text: string): Layout {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new LayoutError('That file isn’t valid JSON. Choose a layout file exported from this app.')
  }
  const o = obj(raw)
  if (o.format !== 'journal-layout') throw new LayoutError('That file isn’t a journal layout. Choose a layout file exported from this app.')
  const pages = arr(o.pages)
  if (pages.length === 0) throw new LayoutError('That layout has no pages in it.')
  return {
    format: 'journal-layout',
    version: 1,
    journal: o.journal ? (obj(o.journal) as Partial<Settings>) : undefined,
    pages: pages.map((p, i) => {
      const po = obj(p)
      return {
        title: str(po.title, `Page ${i + 1}`),
        blocks: arr(po.blocks)
          .map((b) => obj(b))
          .filter((b) => typeof b.type === 'string' && (BLOCK_ORDER as string[]).includes(b.type))
          .map((b) => ({ ...b, type: b.type as BlockType })),
      }
    }),
  }
}

export interface NewRows {
  pages: Page[]
  blocks: Block[]
  items: Item[]
}

const uuid = () => crypto.randomUUID()

/** Default title and settings for a freshly added block. */
export function defaultBlock(type: BlockType): { title: string; data: Record<string, unknown> } {
  switch (type) {
    case 'challenge':
      return {
        title: 'Challenge',
        data: {
          noteLabel: 'What happened?',
          categories: [
            { id: 'career', label: 'Career', color: 'blue' },
            { id: 'creative', label: 'Creative', color: 'purple' },
            { id: 'brave', label: 'Brave', color: 'red' },
          ],
        },
      }
    case 'habits':
      return { title: 'Habits', data: { intro: '' } }
    case 'ideas':
      return { title: 'Ideas', data: {} }
    case 'notes':
      return { title: 'Notes', data: { intro: '', placeholder: 'Write here…', body: '' } }
    case 'checklist':
      return { title: 'To do', data: {} }
    case 'facts':
      return { title: 'Key facts', data: { facts: [] } }
    case 'text':
      return { title: 'Heading', data: { body: '' } }
  }
}

/** Turn one layout block into a block row plus its item rows. */
function blockRows(lb: LayoutBlock, pageId: string, position: number): { block: Block; items: Item[] } {
  const id = uuid()
  const base = defaultBlock(lb.type)
  const title = typeof lb.title === 'string' ? lb.title : base.title
  const items: Item[] = []
  const pushItem = (data: Record<string, unknown>, done = false) =>
    items.push({ id: uuid(), block_id: id, position: items.length + 1, data, done, done_at: done ? new Date().toISOString() : null })

  let data: Record<string, unknown> = base.data
  const src = arr(lb.items).map((x) => obj(x))

  switch (lb.type) {
    case 'challenge': {
      const d = read.challenge({ ...base.data, ...lb })
      data = { noteLabel: d.noteLabel, categories: Array.isArray(lb.categories) ? d.categories : base.data.categories }
      for (const s of src) {
        const it = read.challengeItem(s)
        pushItem({ ...it }, s.done === true)
      }
      const length = Math.min(365, Math.max(0, Math.round(num(lb.length, 0))))
      while (items.length < length) pushItem({ title: '', how: '', category: '', note: '' })
      break
    }
    case 'habits':
      data = { ...read.habits(lb) }
      for (const s of src) pushItem({ ...read.habitItem(s) })
      break
    case 'ideas':
      data = {}
      for (const s of src) pushItem({ ...read.ideaItem(s) })
      break
    case 'checklist':
      data = {}
      for (const s of src) pushItem({ ...read.checklistItem(s) }, s.done === true)
      break
    case 'notes':
      data = { ...read.notes({ ...base.data, ...lb }) }
      break
    case 'facts':
      data = { ...read.facts(lb) }
      break
    case 'text':
      data = { ...read.text(lb) }
      break
  }

  return { block: { id, page_id: pageId, position, type: lb.type, title, data }, items }
}

/** Build all rows for a layout. Pages are placed after `startPosition`. */
export function layoutToRows(layout: Layout, startPosition: number): NewRows {
  const rows: NewRows = { pages: [], blocks: [], items: [] }
  layout.pages.forEach((lp, pi) => {
    const pageId = uuid()
    rows.pages.push({ id: pageId, position: startPosition + pi + 1, title: lp.title })
    lp.blocks.forEach((lb, bi) => {
      const { block, items } = blockRows(lb, pageId, bi + 1)
      rows.blocks.push(block)
      rows.items.push(...items)
    })
  })
  return rows
}

/** Export the whole journal, including what has been written in it. */
export function stateToLayout(state: JournalState): Layout {
  const byPos = <T extends { position: number }>(a: T, b: T) => a.position - b.position
  return {
    format: 'journal-layout',
    version: 1,
    journal: { ...state.settings },
    pages: [...state.pages].sort(byPos).map((p) => ({
      title: p.title,
      blocks: state.blocks
        .filter((b) => b.page_id === p.id)
        .sort(byPos)
        .map((b): LayoutBlock => {
          const its = state.items.filter((i) => i.block_id === b.id).sort(byPos)
          switch (b.type) {
            case 'challenge':
              return {
                type: b.type,
                title: b.title,
                ...read.challenge(b.data),
                length: its.length,
                items: its.map((i) => ({ ...read.challengeItem(i.data), done: i.done })),
              }
            case 'habits':
              return { type: b.type, title: b.title, ...read.habits(b.data), items: its.map((i) => read.habitItem(i.data)) }
            case 'ideas':
              return { type: b.type, title: b.title, items: its.map((i) => read.ideaItem(i.data)) }
            case 'checklist':
              return { type: b.type, title: b.title, items: its.map((i) => ({ ...read.checklistItem(i.data), done: i.done })) }
            case 'notes':
              return { type: b.type, title: b.title, ...read.notes(b.data) }
            case 'facts':
              return { type: b.type, title: b.title, ...read.facts(b.data) }
            case 'text':
              return { type: b.type, title: b.title, ...read.text(b.data) }
          }
        }),
    })),
  }
}
