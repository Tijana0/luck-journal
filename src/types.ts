export type BlockType = 'challenge' | 'habits' | 'ideas' | 'notes' | 'checklist' | 'facts' | 'text'
export type Mode = 'write' | 'edit'

export interface Settings {
  eyebrow: string
  title: string
  subtitle: string
}

export interface Page {
  id: string
  position: number
  title: string
}

export interface Block {
  id: string
  page_id: string
  position: number
  type: BlockType
  title: string
  data: Record<string, unknown>
}

export interface Item {
  id: string
  block_id: string
  position: number
  data: Record<string, unknown>
  done: boolean
  done_at: string | null
}

export interface HabitLog {
  item_id: string
  day: string // YYYY-MM-DD, local date
}

export interface JournalState {
  settings: Settings
  pages: Page[]
  blocks: Block[]
  items: Item[]
  logs: HabitLog[]
}

// ── Per-block shapes (stored in blocks.data / items.data as JSON) ─────────

export type CategoryColor = 'blue' | 'green' | 'purple' | 'red' | 'orange' | 'teal'
export const CATEGORY_COLORS: CategoryColor[] = ['blue', 'green', 'purple', 'red', 'orange', 'teal']

export interface Category {
  id: string
  label: string
  color: CategoryColor
}

export interface ChallengeData {
  noteLabel: string
  categories: Category[]
  /** Show a Shuffle button in Write mode. */
  shuffle: boolean
}
export interface ChallengeItem {
  title: string
  how: string
  category: string
  note: string
}

export interface HabitsData {
  intro: string
}
export interface HabitItem {
  name: string
  rhythm: string
  weeklyGoal: number
  status: 'active' | 'queued'
  note: string
}

export interface IdeaSection {
  heading: string
  text: string
}
export interface IdeaItem {
  title: string
  status: string
  summary: string
  sections: IdeaSection[]
}

export interface NotesData {
  intro: string
  placeholder: string
  body: string
}

export interface ChecklistItem {
  text: string
}

export interface Fact {
  label: string
  value: string
}
export interface FactsData {
  facts: Fact[]
}

export interface TextData {
  body: string
}

// ── Block catalogue shown in the "Add block" picker ──────────────────────

export const BLOCK_INFO: Record<BlockType, { name: string; description: string }> = {
  challenge: { name: 'Challenge list', description: 'Numbered goals with a checkbox, a category and a note on how it went.' },
  habits: { name: 'Habit tracker', description: 'Habits with a weekly goal. Tap the days you showed up.' },
  ideas: { name: 'Idea cards', description: 'Cards with a status, a summary and labeled sections.' },
  notes: { name: 'Notes', description: 'Lined free-writing space.' },
  checklist: { name: 'Checklist', description: 'A simple to-do list.' },
  facts: { name: 'Key facts', description: 'Small label and value tiles.' },
  text: { name: 'Text', description: 'A heading with a paragraph or bullet list.' },
}

export const BLOCK_ORDER: BlockType[] = ['challenge', 'habits', 'ideas', 'notes', 'checklist', 'facts', 'text']

// ── Safe readers: JSON from the database may be missing fields ───────────

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback)
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

const isColor = (v: unknown): v is CategoryColor => typeof v === 'string' && (CATEGORY_COLORS as string[]).includes(v)

export const read = {
  challenge(d: Record<string, unknown>): ChallengeData {
    return {
      noteLabel: str(d.noteLabel, 'What happened?'),
      shuffle: d.shuffle === true,
      categories: arr(d.categories).map((c, i) => {
        const o = obj(c)
        return { id: str(o.id, `c${i}`), label: str(o.label), color: isColor(o.color) ? o.color : CATEGORY_COLORS[i % CATEGORY_COLORS.length] }
      }),
    }
  },
  challengeItem(d: Record<string, unknown>): ChallengeItem {
    return { title: str(d.title), how: str(d.how), category: str(d.category), note: str(d.note) }
  },
  habits(d: Record<string, unknown>): HabitsData {
    return { intro: str(d.intro) }
  },
  habitItem(d: Record<string, unknown>): HabitItem {
    const goal = Math.round(num(d.weeklyGoal, 3))
    return {
      name: str(d.name),
      rhythm: str(d.rhythm),
      weeklyGoal: Math.min(7, Math.max(1, goal)),
      status: d.status === 'queued' ? 'queued' : 'active',
      note: str(d.note),
    }
  },
  ideaItem(d: Record<string, unknown>): IdeaItem {
    return {
      title: str(d.title),
      status: str(d.status),
      summary: str(d.summary),
      sections: arr(d.sections).map((s) => {
        const o = obj(s)
        return { heading: str(o.heading), text: str(o.text) }
      }),
    }
  },
  notes(d: Record<string, unknown>): NotesData {
    return { intro: str(d.intro), placeholder: str(d.placeholder), body: str(d.body) }
  },
  checklistItem(d: Record<string, unknown>): ChecklistItem {
    return { text: str(d.text) }
  },
  facts(d: Record<string, unknown>): FactsData {
    return {
      facts: arr(d.facts).map((f) => {
        const o = obj(f)
        return { label: str(o.label), value: str(o.value) }
      }),
    }
  },
  text(d: Record<string, unknown>): TextData {
    return { body: str(d.body) }
  },
}

export const helpers = { str, num, arr, obj }
