import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/** False when the Supabase keys are missing, so the app can show setup help. */
export const isConfigured = Boolean(url && anonKey)

// The anon key is meant to be public. Row-level security in
// supabase/schema.sql is what keeps each person's data private.
export const supabase = createClient(url ?? 'http://localhost:54321', anonKey ?? 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
