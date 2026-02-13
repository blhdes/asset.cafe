import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

let _supabase: SupabaseClient | null = null

export function getSupabase() {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env and fill in your Supabase credentials.',
      )
    }
    _supabase = createClient(supabaseUrl, supabaseAnonKey)
  }
  return _supabase
}

/**
 * Returns a Supabase client scoped to a specific vault.
 * Every query made through this client will include the
 * x-vault-hash header so RLS policies can filter rows.
 */
export function vaultClient(vaultHash: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your Supabase credentials.',
    )
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { 'x-vault-hash': vaultHash } },
  })
}
