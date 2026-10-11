import { useMemo, useState } from 'react'
import { useJournal } from '../store'
import { read } from '../types'
import { DAY_NAMES, isoDay, mondayOf, parseDay, shortDate, weekDays } from '../dates'
import { DebouncedField } from '../components/DebouncedField'
import { ConfirmDelete, EmptyHint, Icon, IconButton } from '../components/ui'
import type { BlockProps } from './types'

export function HabitsBlock({ block, items, mode }: BlockProps) {
  const { state, actions } = useJournal()
  const d = read.habits(block.data)
  const [offset, setOffset] = useState(0)
  const today = isoDay(new Date())
  const days = weekDays(offset)

  const ids = useMemo(() => new Set(items.map((i) => i.id)), [items])
  const logs = useMemo(() => state.logs.filter((l) => ids.has(l.item_id)), [state.logs, ids])
  const logged = useMemo(() => new Set(logs.map((l) => `${l.item_id}|${l.day}`)), [logs])

  // Weeks where each habit reached its goal, across all history.
  const weeksOnTarget = useMemo(() => {
    const perWeek = new Map<string, number>()
    for (const l of logs) {
      const key = `${l.item_id}|${isoDay(mondayOf(parseDay(l.day)))}`
      perWeek.set(key, (perWeek.get(key) ?? 0) + 1)
    }
    const result = new Map<string, number>()
    for (const item of items) {
      const goal = read.habitItem(item.data).weeklyGoal
      let n = 0
      for (const [key, count] of perWeek) if (key.startsWith(`${item.id}|`) && count >= goal) n++
      result.set(item.id, n)
    }
    return result
  }, [logs, items])

  if (mode === 'edit') {
    return (
      <div className="editor">
        <div className="field-grid">
          <label className="eyebrow" htmlFor={`${block.id}-intro`}>Intro (optional)</label>
          <DebouncedField id={`${block.id}-intro`} className="field" value={d.intro} onCommit={(intro) => actions.updateBlock(block.id, { data: { intro } })} placeholder="e.g. Tap the days you practiced." />
        </div>
        <ol className="edit-list">
          {items.map((item, idx) => {
            const h = read.habitItem(item.data)
            return (
              <li key={item.id} className="edit-row">
                <div className="edit-fields">
                  <DebouncedField id={`${item.id}-n`} className="field" value={h.name} placeholder="Habit, e.g. Stretching" label={`Habit ${idx + 1} name`} onCommit={(name) => actions.updateItem(item.id, { data: { name } })} />
                  <DebouncedField id={`${item.id}-r`} className="field" value={h.rhythm} placeholder="Rhythm, e.g. Every other day" label={`Habit ${idx + 1} rhythm`} onCommit={(rhythm) => actions.updateItem(item.id, { data: { rhythm } })} />
                  <div className="inline-fields">
                    <label className="mini" htmlFor={`${item.id}-g`}>Days per week</label>
                    <select id={`${item.id}-g`} className="field select" value={h.weeklyGoal} onChange={(e) => actions.updateItem(item.id, { data: { weeklyGoal: Number(e.target.value) } })}>
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <label className="mini" htmlFor={`${item.id}-s`}>Status</label>
                    <select id={`${item.id}-s`} className="field select" value={h.status} onChange={(e) => actions.updateItem(item.id, { data: { status: e.target.value } })}>
                      <option value="active">Tracking</option>
                      <option value="queued">Queued for later</option>
                    </select>
                  </div>
                  {h.status === 'queued' && (
                    <DebouncedField id={`${item.id}-note`} className="field" value={h.note} placeholder="Note, e.g. Start after the course ends" label={`Habit ${idx + 1} note`} onCommit={(note) => actions.updateItem(item.id, { data: { note } })} />
                  )}
                </div>
                <div className="row-tools">
                  <IconButton icon="up" label="Move up" onClick={() => actions.moveItem(item.id, -1)} disabled={idx === 0} />
                  <IconButton icon="down" label="Move down" onClick={() => actions.moveItem(item.id, 1)} disabled={idx === items.length - 1} />
                  <ConfirmDelete label={`Delete habit ${h.name || idx + 1}`} what="this habit and its history" onConfirm={() => actions.deleteItem(item.id)} />
                </div>
              </li>
            )
          })}
        </ol>
        <button type="button" className="btn small" onClick={() => actions.addItems(block.id, [{ name: '', rhythm: '', weeklyGoal: 3, status: 'active', note: '' }])}>
          <Icon name="plus" size={16} /> Habit
        </button>
      </div>
    )
  }

  const active = items.filter((i) => read.habitItem(i.data).status === 'active')
  const queued = items.filter((i) => read.habitItem(i.data).status === 'queued')

  if (items.length === 0) return <EmptyHint>No habits yet. Switch to Edit to add one and give it a weekly goal.</EmptyHint>

  return (
    <>
      {d.intro && <p className="block-intro">{d.intro}</p>}
      {active.length > 0 && (
        <div className="weekbar">
          <button type="button" className="wk" aria-label="Previous week" onClick={() => setOffset((o) => o - 1)}>
            <Icon name="left" />
          </button>
          <span className="count">
            {offset === 0 ? 'This week · ' : ''}
            {shortDate(days[0])} – {shortDate(days[6])}
          </span>
          <button type="button" className="wk" aria-label="Next week" disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(0, o + 1))}>
            <Icon name="right" />
          </button>
        </div>
      )}

      <div className="skills">
        {active.map((item) => {
          const h = read.habitItem(item.data)
          const got = days.filter((day) => logged.has(`${item.id}|${isoDay(day)}`)).length
          const met = got >= h.weeklyGoal
          const wm = weeksOnTarget.get(item.id) ?? 0
          const name = h.name || 'Unnamed habit'
          return (
            <div key={item.id} className={`skill${met ? ' met' : ''}`}>
              <div className="skill-head">
                <div>
                  <h3>{name}</h3>
                  {h.rhythm && <span className="rhythm">{h.rhythm}</span>}
                </div>
                <span className="tally">
                  {got} / {h.weeklyGoal}
                  {met ? ' ✓ goal met' : ''}
                </span>
              </div>
              <div className="days">
                {days.map((day, i) => {
                  const key = isoDay(day)
                  const on = logged.has(`${item.id}|${key}`)
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`day${on ? ' on' : ''}${key === today ? ' today' : ''}`}
                      aria-pressed={on}
                      aria-label={`${name}, ${DAY_NAMES[i]} ${day.getDate()}`}
                      disabled={key > today}
                      onClick={() => actions.setPracticed(item.id, key, !on)}
                    >
                      {DAY_NAMES[i][0]}
                      <b>{day.getDate()}</b>
                    </button>
                  )
                })}
              </div>
              <span className="weeks-met">
                {wm === 0 ? 'No weeks on target yet' : wm === 1 ? '1 week on target so far' : `${wm} weeks on target so far`}
              </span>
            </div>
          )
        })}
      </div>

      {queued.map((item) => {
        const h = read.habitItem(item.data)
        return (
          <div key={item.id} className="queued">
            <span className="status q">Queued</span>
            <h3>{h.name || 'Unnamed habit'}</h3>
            {h.note && <p>{h.note}</p>}
            <button type="button" className="btn small" onClick={() => actions.updateItem(item.id, { data: { status: 'active' } })}>
              Start tracking
            </button>
          </div>
        )
      })}
    </>
  )
}
