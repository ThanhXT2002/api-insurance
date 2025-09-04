import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL, Service Role Key or Anon Key in environment variables')
}

// Client với Service Role Key - dùng để thao tác database (bypass RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Client với Anon Key - dùng để verify JWT tokens từ client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
