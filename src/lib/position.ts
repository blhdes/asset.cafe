import type { SupabaseClient } from '@supabase/supabase-js'

export async function updatePositions(
  db: SupabaseClient,
  table: string,
  items: { id: string; position: number }[],
) {
  await Promise.all(
    items.map(item =>
      db.from(table).update({ position: item.position }).eq('id', item.id),
    ),
  )
}
