import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

// Avoid throwing at import-time to prevent serverless function init crashes.
// If env vars are missing, we log a warning and delay throwing until the client is actually requested.
let _supabaseAdmin: SupabaseClient | null = null
let _supabase: SupabaseClient | null = null

if (supabaseUrl && supabaseServiceKey) {
  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
} else {
  // eslint-disable-next-line no-console
  console.warn('Supabase admin client not initialized: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
}

if (supabaseUrl && supabaseAnonKey) {
  _supabase = createClient(supabaseUrl, supabaseAnonKey)
} else {
  // eslint-disable-next-line no-console
  console.warn('Supabase anon client not initialized: missing SUPABASE_URL or SUPABASE_ANON_KEY')
}

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    throw new Error('Supabase admin client not initialized. Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return _supabaseAdmin
}

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    throw new Error('Supabase anon client not initialized. Missing SUPABASE_URL or SUPABASE_ANON_KEY')
  }
  return _supabase
}

// Backwards-compatible exports (may be null if not initialized)
export const supabaseAdmin = _supabaseAdmin
export const supabase = _supabase
