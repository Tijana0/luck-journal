import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import { defaultBlock, layoutToRows, type Layout } from './layout'
import type { Block, BlockType, HabitLog, Item, JournalState, Page, Settings } from './types'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type Result = PromiseLike<{ error: unknown }>

const DEFAULT_SETTINGS: Settings = { eyebrow: '', title: 'My journal', subtitle: '' }
const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position

export interface Actions {
  updateSettings(patch: Partial<Settings>): void
  addPage(title?: string): string
  renamePage(id: string, title: string): void
  movePage(id: string, direction: -1 | 1): void
  deletePage(id: string): void
  addBlock(pageId: string, type: BlockType): void
  /** `data` is merged into the block's current data. */
  updateBlock(id: string, patch: { title?: string; data?: Record<string, unknown> }): void
  moveBlock(id: string, direction: -1 | 1): void
  deleteBlock(id: string): void
  addItems(blockId: string, datas: Record<string, unknown>[]): void
  /** `data` is merged into the item's current data. */
  updateItem(id: string, patch: { data?: Record<string, unknown>; done?: boolean }): void
  moveItem(id: string, direction: -1 | 1): void
  deleteItem(id: string): void
  setPracticed(itemId: string, day: string, on: boolean): void
  importLayout(layout: Layout, options: { useHeader: boolean }): string | undefined
  reload(): Promise<void>
}

interface JournalContext {
  state: JournalState
  saveState: SaveState
  actions: Actions
}

const Ctx = createContext<JournalContext | null>(null)

export function useJournal(): JournalContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useJournal must be used inside <JournalProvider>')
  return ctx
}

async function fetchJournal(): Promise<JournalState> {
  const [settings, pages, blocks, items, logs] = await Promise.all([
    supabase.from('journal_settings').select('eyebrow,title,subtitle').maybeSingle(),
    supabase.from('pages').select('id,position,title').order('position'),
    supabase.from('blocks').select('id,page_id,position,type,title,data').order('position'),
    supabase.from('items').select('id,block_id,position,data,done,done_at').order('position'),
    supabase.from('habit_logs').select('item_id,day'),
  ])
  for (const r of [settings, pages, blocks, items, logs]) if (r.error) throw r.error
  return {
    settings: (settings.data as Settings | null) ?? DEFAULT_SETTINGS,
    pages: (pages.data ?? []) as Page[],
    blocks: (blocks.data ?? []) as Block[],
    items: (items.data ?? []) as Item[],
    logs: (logs.data ?? []) as HabitLog[],
  }
}

interface ProviderProps {
  userId: string
  children: (status: { loading: boolean; error: string; retry: () => void }) => ReactNode
}

export function JournalProvider({ userId, children }: ProviderProps) {
  const [state, setState] = useState<JournalState>({ settings: DEFAULT_SETTINGS, pages: [], blocks: [], items: [], logs: [] })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')

  // Mirror of state for reading inside actions without stale closures.
  const stateRef = useRef(state)
  // Apply a change synchronously to the ref, so the very next line of an action
  // (and the next action) already sees it.
  const commit = useCallback((next: (s: JournalState) => JournalState) => {
    const n = next(stateRef.current)
    stateRef.current = n
    setState(n)
  }, [])

  const reload = useCallback(async () => {
    try {
      const fresh = await fetchJournal()
      stateRef.current = fresh
      setState(fresh)
      setLoadError('')
    } catch (e) {
      console.error(e)
      setLoadError(e instanceof Error ? e.message : 'Something went wrong while loading.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  // Writes run one after another, so a block is never saved before its page.
  const queue = useRef<Promise<void>>(Promise.resolve())
  const pending = useRef(0)
  const failed = useRef(false)
  const write = useCallback(
    (makeOps: () => Result[]) => {
      pending.current++
      setSaveState('saving')
      queue.current = queue.current
        .then(async () => {
          const results = await Promise.all(makeOps())
          const bad = results.find((r) => r.error)
          if (bad) {
            console.error(bad.error)
            failed.current = true
          }
        })
        .catch((e: unknown) => {
          console.error(e)
          failed.current = true
        })
        .finally(() => {
          pending.current--
          if (pending.current === 0) {
            if (failed.current) {
              failed.current = false
              setSaveState('error')
              void reload() // put the screen back in line with what was actually saved
            } else {
              setSaveState('saved')
            }
          }
        })
    },
    [reload],
  )

  const actions = useMemo<Actions>(() => {
    const nextPosition = (list: { position: number }[]) => list.reduce((m, x) => Math.max(m, x.position), 0) + 1

    // Swap positions with the neighbour in the given direction.
    function swap<T extends { id: string; position: number }>(list: T[], id: string, direction: -1 | 1): [T, T] | null {
      const sorted = [...list].sort(byPosition)
      const i = sorted.findIndex((x) => x.id === id)
      const j = i + direction
      if (i < 0 || j < 0 || j >= sorted.length) return null
      return [sorted[i], sorted[j]]
    }

    return {
      updateSettings(patch) {
        commit((s) => ({ ...s, settings: { ...s.settings, ...patch } }))
        const settings = { ...stateRef.current.settings }
        write(() => [
          supabase.from('journal_settings').upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' }),
        ])
      },

      addPage(title = 'New page') {
        const page: Page = { id: crypto.randomUUID(), position: nextPosition(stateRef.current.pages), title }
        commit((s) => ({ ...s, pages: [...s.pages, page] }))
        write(() => [supabase.from('pages').insert({ ...page, user_id: userId })])
        return page.id
      },

      renamePage(id, title) {
        commit((s) => ({ ...s, pages: s.pages.map((p) => (p.id === id ? { ...p, title } : p)) }))
        write(() => [supabase.from('pages').update({ title }).eq('id', id)])
      },

      movePage(id, direction) {
        const pair = swap(stateRef.current.pages, id, direction)
        if (!pair) return
        const [a, b] = pair
        commit((s) => ({
          ...s,
          pages: s.pages.map((p) => (p.id === a.id ? { ...p, position: b.position } : p.id === b.id ? { ...p, position: a.position } : p)),
        }))
        write(() => [
          supabase.from('pages').update({ position: b.position }).eq('id', a.id),
          supabase.from('pages').update({ position: a.position }).eq('id', b.id),
        ])
      },

      deletePage(id) {
        commit((s) => {
          const blockIds = new Set(s.blocks.filter((b) => b.page_id === id).map((b) => b.id))
          const itemIds = new Set(s.items.filter((i) => blockIds.has(i.block_id)).map((i) => i.id))
          return {
            ...s,
            pages: s.pages.filter((p) => p.id !== id),
            blocks: s.blocks.filter((b) => !blockIds.has(b.id)),
            items: s.items.filter((i) => !itemIds.has(i.id)),
            logs: s.logs.filter((l) => !itemIds.has(l.item_id)),
          }
        })
        write(() => [supabase.from('pages').delete().eq('id', id)]) // blocks, items and logs cascade
      },

      addBlock(pageId, type) {
        const siblings = stateRef.current.blocks.filter((b) => b.page_id === pageId)
        const base = defaultBlock(type)
        const block: Block = { id: crypto.randomUUID(), page_id: pageId, position: nextPosition(siblings), type, title: base.title, data: base.data }
        commit((s) => ({ ...s, blocks: [...s.blocks, block] }))
        write(() => [supabase.from('blocks').insert({ ...block, user_id: userId })])
      },

      updateBlock(id, patch) {
        // `data` is merged into the latest saved data, so two quick edits never overwrite each other.
        const current = stateRef.current.blocks.find((b) => b.id === id)
        if (!current) return
        const next: Partial<Block> = {}
        if (patch.title !== undefined) next.title = patch.title
        if (patch.data !== undefined) next.data = { ...current.data, ...patch.data }
        commit((s) => ({ ...s, blocks: s.blocks.map((b) => (b.id === id ? { ...b, ...next } : b)) }))
        write(() => [supabase.from('blocks').update(next).eq('id', id)])
      },

      moveBlock(id, direction) {
        const block = stateRef.current.blocks.find((b) => b.id === id)
        if (!block) return
        const pair = swap(stateRef.current.blocks.filter((b) => b.page_id === block.page_id), id, direction)
        if (!pair) return
        const [a, b] = pair
        commit((s) => ({
          ...s,
          blocks: s.blocks.map((x) => (x.id === a.id ? { ...x, position: b.position } : x.id === b.id ? { ...x, position: a.position } : x)),
        }))
        write(() => [
          supabase.from('blocks').update({ position: b.position }).eq('id', a.id),
          supabase.from('blocks').update({ position: a.position }).eq('id', b.id),
        ])
      },

      deleteBlock(id) {
        commit((s) => {
          const itemIds = new Set(s.items.filter((i) => i.block_id === id).map((i) => i.id))
          return {
            ...s,
            blocks: s.blocks.filter((b) => b.id !== id),
            items: s.items.filter((i) => i.block_id !== id),
            logs: s.logs.filter((l) => !itemIds.has(l.item_id)),
          }
        })
        write(() => [supabase.from('blocks').delete().eq('id', id)])
      },

      addItems(blockId, datas) {
        if (datas.length === 0) return
        const start = nextPosition(stateRef.current.items.filter((i) => i.block_id === blockId))
        const rows: Item[] = datas.map((data, k) => ({ id: crypto.randomUUID(), block_id: blockId, position: start + k, data, done: false, done_at: null }))
        commit((s) => ({ ...s, items: [...s.items, ...rows] }))
        write(() => [supabase.from('items').insert(rows.map((r) => ({ ...r, user_id: userId })))])
      },

      updateItem(id, patch) {
        const current = stateRef.current.items.find((i) => i.id === id)
        if (!current) return
        const full: Partial<Item> = {}
        if (patch.data !== undefined) full.data = { ...current.data, ...patch.data }
        if (patch.done !== undefined) {
          full.done = patch.done
          full.done_at = patch.done ? new Date().toISOString() : null
        }
        commit((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? { ...i, ...full } : i)) }))
        write(() => [supabase.from('items').update(full).eq('id', id)])
      },

      moveItem(id, direction) {
        const item = stateRef.current.items.find((i) => i.id === id)
        if (!item) return
        const pair = swap(stateRef.current.items.filter((i) => i.block_id === item.block_id), id, direction)
        if (!pair) return
        const [a, b] = pair
        commit((s) => ({
          ...s,
          items: s.items.map((x) => (x.id === a.id ? { ...x, position: b.position } : x.id === b.id ? { ...x, position: a.position } : x)),
        }))
        write(() => [
          supabase.from('items').update({ position: b.position }).eq('id', a.id),
          supabase.from('items').update({ position: a.position }).eq('id', b.id),
        ])
      },

      deleteItem(id) {
        commit((s) => ({ ...s, items: s.items.filter((i) => i.id !== id), logs: s.logs.filter((l) => l.item_id !== id) }))
        write(() => [supabase.from('items').delete().eq('id', id)])
      },

      setPracticed(itemId, day, on) {
        commit((s) => {
          const rest = s.logs.filter((l) => !(l.item_id === itemId && l.day === day))
          return { ...s, logs: on ? [...rest, { item_id: itemId, day }] : rest }
        })
        write(() => [
          on
            ? supabase.from('habit_logs').upsert({ user_id: userId, item_id: itemId, day }, { onConflict: 'item_id,day', ignoreDuplicates: true })
            : supabase.from('habit_logs').delete().eq('item_id', itemId).eq('day', day),
        ])
      },

      importLayout(layout, { useHeader }) {
        const rows = layoutToRows(layout, nextPosition(stateRef.current.pages) - 1)
        const withUser = <T extends object>(list: T[]) => list.map((r) => ({ ...r, user_id: userId }))
        commit((s) => ({
          ...s,
          settings: useHeader && layout.journal ? { ...s.settings, ...layout.journal } : s.settings,
          pages: [...s.pages, ...rows.pages],
          blocks: [...s.blocks, ...rows.blocks],
          items: [...s.items, ...rows.items],
        }))
        if (useHeader && layout.journal) {
          const settings = { ...stateRef.current.settings }
          write(() => [supabase.from('journal_settings').upsert({ user_id: userId, ...settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })])
        }
        // Parents before children, each as one request.
        if (rows.pages.length) write(() => [supabase.from('pages').insert(withUser(rows.pages))])
        if (rows.blocks.length) write(() => [supabase.from('blocks').insert(withUser(rows.blocks))])
        if (rows.items.length) write(() => [supabase.from('items').insert(withUser(rows.items))])
        return rows.pages[0]?.id
      },

      reload,
    }
  }, [commit, reload, userId, write])

  const value = useMemo(() => ({ state, saveState, actions }), [state, saveState, actions])
  return <Ctx.Provider value={value}>{children({ loading, error: loadError, retry: () => void reload() })}</Ctx.Provider>
}

// ── Selectors ────────────────────────────────────────────────────────────

export function sortedPages(state: JournalState): Page[] {
  return [...state.pages].sort(byPosition)
}
export function blocksOf(state: JournalState, pageId: string): Block[] {
  return state.blocks.filter((b) => b.page_id === pageId).sort(byPosition)
}
export function itemsOf(state: JournalState, blockId: string): Item[] {
  return state.items.filter((i) => i.block_id === blockId).sort(byPosition)
}
