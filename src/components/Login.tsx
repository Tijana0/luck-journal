import { useState, type FormEvent } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { supabase } from '../supabase'

type Mode = 'signin' | 'signup'

/**
 * Supabase accounts need an email, but this app signs in with a username.
 * A username is stored as <username>@luck-journal.app. No mail is ever sent
 * there, because email confirmation is off. Typing a full email still works,
 * for accounts created with a real address.
 */
const USERNAME_DOMAIN = 'luck-journal.app'
const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/

function toAuthEmail(input: string): string {
  const value = input.trim().toLowerCase()
  return value.includes('@') ? value : `${value}@${USERNAME_DOMAIN}`
}

function friendly(error: AuthError): string {
  const msg = error.message.toLowerCase()
  if (error.status === 429 || msg.includes('rate limit')) return 'Too many attempts in a short time. Wait a few minutes and try again.'
  if (msg.includes('invalid login credentials')) return 'That username and password don’t match.'
  if (msg.includes('already registered') || msg.includes('already been registered')) return 'That username is taken. Pick another one, or sign in.'
  if (msg.includes('email not confirmed')) return 'This account isn’t confirmed yet. In Supabase, turn off "Confirm email" or confirm the user under Authentication → Users.'
  if (msg.includes('signups not allowed')) return 'New accounts are switched off in Supabase (Authentication → Sign In / Providers → Allow new users to sign up).'
  if (msg.includes('password')) return error.message
  return `Something went wrong: ${error.message}`
}

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
    {!open && <path d="M4 20L20 4" />}
  </svg>
)

export function Login() {
  const [mode, setMode] = useState<Mode>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const switchTo = (m: Mode) => {
    setMode(m)
    setError('')
    setInfo('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    const name = username.trim().toLowerCase()

    if (mode === 'signup' && !USERNAME_PATTERN.test(name)) {
      setError('Usernames are 3–30 characters: letters, numbers, dots, dashes or underscores.')
      return
    }

    setBusy(true)
    const email = toAuthEmail(name)

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(friendly(error))
      // On success the auth listener in App swaps this screen for the journal.
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(friendly(error))
      // Supabase hides whether an address is taken: an existing account comes back
      // with no identities, so report it as taken.
      else if (data.user && data.user.identities?.length === 0) setError('That username is taken. Pick another one, or sign in.')
      else if (!data.session)
        setError('Account created, but Supabase still wants email confirmation. Turn off "Confirm email" in Supabase, or confirm the user under Authentication → Users, then sign in.')
    }
    setBusy(false)
  }

  return (
    <div className="login card">
      <h2>{mode === 'signin' ? 'Sign in' : 'Create your account'}</h2>
      <form onSubmit={submit} className="idea-form">
        <p>Everything you write is saved to your account and syncs across your devices.</p>

        <label htmlFor="login-username" className="eyebrow">Username</label>
        <input
          id="login-username"
          className="field"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={mode === 'signup' ? 'e.g. alex' : ''}
        />

        <label htmlFor="login-password" className="eyebrow">Password</label>
        <div className="password-field">
          <input
            id="login-password"
            className="field"
            type={showPassword ? 'text' : 'password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
          />
          <button
            type="button"
            className="reveal"
            onClick={() => setShowPassword((s) => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            <EyeIcon open={!showPassword} />
          </button>
        </div>

        <div className="row">
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </div>

        {error && <p className="error" role="alert">{error}</p>}
        {info && <p role="status">{info}</p>}

        <div className="login-switch">
          {mode === 'signin' ? (
            <button type="button" className="link" onClick={() => switchTo('signup')}>Create an account</button>
          ) : (
            <button type="button" className="link" onClick={() => switchTo('signin')}>I have an account, sign in</button>
          )}
        </div>
      </form>
    </div>
  )
}
