import { createClient } from '@supabase/supabase-js'

// Empty strings count as missing: a GitHub Actions variable that isn't set builds as "".
const url = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

/** False when the Supabase keys are missing, so the app can show setup help instead of crashing. */
export const isConfigured = Boolean(url && anonKey)

// The anon key is meant to be public. Row-level security in supabase/migrations
// is what keeps each person's data private.
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
