import { useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './supabase'
import { JournalProvider, sortedPages, useJournal } from './store'
import type { Mode } from './types'
import { Login } from './components/Login'
import { JournalHeader, PageTabs, PageView } from './components/Shell'
import { JournalTools, Onboarding } from './components/Setup'
import { BackToTop, Icon } from './components/ui'

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value)
    } catch {
      /* storage unavailable, e.g. private mode */
    }
  },
}

function Frame({ children, top }: { children: ReactNode; top?: ReactNode }) {
  return (
    <div className="page-wrap">
      {top}
      {children}
    </div>
  )
}

function Welcome({ children }: { children: ReactNode }) {
  return (
    <Frame>
      <header className="masthead">
        <span className="eyebrow">A journal you build yourself</span>
        <h1>
          <mark>Luck Journal</mark>
        </h1>
        <p className="lede">Pages for your goals, habits and ideas, made from blocks you arrange however you like.</p>
      </header>
      {children}
    </Frame>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isConfigured) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isConfigured) {
    return (
      <Welcome>
        <div className="card">
          <h2>Almost there</h2>
          <p>
            The app can't find its Supabase keys. Copy <code>.env.example</code> to <code>.env.local</code>, fill in the values from your Supabase project, and restart{' '}
            <code>npm run dev</code>. When deploying, add them as repository variables (see the README).
          </p>
        </div>
      </Welcome>
    )
  }
  if (!ready) return <Welcome><p className="muted">Loading…</p></Welcome>
  if (!session) return <Welcome><Login /></Welcome>

  return (
    <JournalProvider key={session.user.id} userId={session.user.id}>
      {({ loading, error, retry }) =>
        error ? (
          <Welcome>
            <div className="card error-card" role="alert">
              <h2>Couldn't load your journal</h2>
              <p>{error}</p>
              <p className="muted">If this is a new Supabase project, check that you ran the SQL in supabase/migrations.</p>
              <button type="button" className="btn" onClick={retry}>Try again</button>
            </div>
          </Welcome>
        ) : loading ? (
          <Welcome><p className="muted">Loading your journal…</p></Welcome>
        ) : (
          <Journal />
        )
      }
    </JournalProvider>
  )
}

function Journal() {
  const { state, saveState } = useJournal()
  const pages = sortedPages(state)
  const [mode, setModeState] = useState<Mode>(() => (storage.get('journal-mode') === 'edit' ? 'edit' : 'write'))
  const [activeId, setActiveIdState] = useState<string>(() => storage.get('journal-page') ?? '')

  const setMode = (m: Mode) => {
    setModeState(m)
    storage.set('journal-mode', m)
  }
  const setActiveId = (id: string) => {
    setActiveIdState(id)
    storage.set('journal-page', id)
  }

  const active = pages.find((p) => p.id === activeId) ?? pages[0]

  const saveText =
    saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? "Couldn't save. Reloaded the last saved version." : ''

  const topbar = (
    <div className="topbar">
      <span className={`save save-${saveState}`} role="status">{saveText}</span>
      <div className="topbar-right">
        {pages.length > 0 && (
          <div className="mode-switch" role="group" aria-label="Mode">
            <button type="button" aria-pressed={mode === 'write'} onClick={() => setMode('write')}>
              <Icon name="book" size={16} /> Write
            </button>
            <button type="button" aria-pressed={mode === 'edit'} onClick={() => setMode('edit')}>
              <Icon name="pen" size={16} /> Edit
            </button>
          </div>
        )}
        <button type="button" className="link" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </div>
  )

  if (pages.length === 0) {
    return (
      <Frame top={topbar}>
        <header className="masthead">
          <span className="eyebrow">Welcome</span>
          <h1>
            <mark>Let's set up your journal</mark>
          </h1>
        </header>
        <Onboarding
          onDone={(id) => {
            if (id) setActiveId(id)
            setMode('write')
          }}
        />
      </Frame>
    )
  }

  return (
    <Frame top={topbar}>
      <header className={`masthead${mode === 'edit' ? ' editing' : ''}`}>
        <JournalHeader mode={mode} />
      </header>
      {mode === 'edit' && <p className="mode-hint">You're in Edit mode: rename and rearrange pages, add or remove blocks. Switch to Write to use your journal.</p>}
      <PageTabs pages={pages} activeId={active?.id ?? ''} mode={mode} onSelect={setActiveId} />
      {active && <PageView key={active.id} pageId={active.id} mode={mode} onEdit={() => setMode('edit')} />}
      {mode === 'edit' && <JournalTools onPagesAdded={(id) => id && setActiveId(id)} />}
      <BackToTop />
    </Frame>
  )
}
