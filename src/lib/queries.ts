import type { SupabaseClient } from '@supabase/supabase-js'

export function resolveShareKey(supabase: SupabaseClient, shareHash: string) {
  return supabase.from('vault_shares').select('vault_hash').eq('share_hash', shareHash).single()
}

export function fetchAssetsForList(db: SupabaseClient, listId: string) {
  return db.from('assets').select('*').eq('list_id', listId).order('position', { ascending: true })
}

export function fetchListsByVault(db: SupabaseClient, vaultHash: string, listIds?: string[]) {
  let query = db.from('lists').select('*').eq('vault_hash', vaultHash).order('position', { ascending: true })
  if (listIds) query = query.in('id', listIds)
  return query
}
