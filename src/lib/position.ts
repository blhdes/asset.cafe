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

/**
 * Returns the position value for an item dropped at `toIndex` within a
 * sorted list, without renumbering every other item.
 *
 * - toIndex = 0              → one below the current minimum
 * - toIndex = items.length   → one above the current maximum
 * - otherwise                → midpoint of the two neighbours
 */
export function calculateInsertPosition(
  sortedItems: { position: number }[],
  toIndex: number,
): number {
  const before = sortedItems[toIndex - 1]
  const after = sortedItems[toIndex]

  if (before === undefined) return after.position - 1
  if (after === undefined) return before.position + 1
  return (before.position + after.position) / 2
}
