import type { SupabaseClient } from '@supabase/supabase-js'
import type { VaultList, Asset, Resource } from './types'

/* ── Export format ──────────────────────────────────────────── */

interface ExportedAsset {
  name: string
  ticker: string
  summary: string
  description: string
  tags: string[]
  resources: Resource[]
  image_url?: string
}

interface ExportedList {
  name: string
  tags: string[]
  assets: ExportedAsset[]
}

interface VaultExport {
  version: number
  app: string
  exported_at: string
  lists: ExportedList[]
}

/* ── Export ──────────────────────────────────────────────────── */

export async function exportVault(db: SupabaseClient, vaultHash: string, listIds?: string[]) {
  let query = db
    .from('lists')
    .select('*')
    .eq('vault_hash', vaultHash)
    .order('position', { ascending: true })

  if (listIds && listIds.length > 0) {
    query = query.in('id', listIds)
  }

  const { data: lists, error: listErr } = await query

  if (listErr) throw new Error(listErr.message)

  const exportedLists: ExportedList[] = []

  for (const list of (lists ?? []) as VaultList[]) {
    const { data: assets, error: assetErr } = await db
      .from('assets')
      .select('*')
      .eq('list_id', list.id)
      .order('position', { ascending: true })

    if (assetErr) throw new Error(assetErr.message)

    exportedLists.push({
      name: list.name,
      tags: list.tags ?? [],
      assets: ((assets ?? []) as Asset[]).map(a => ({
        name: a.name,
        ticker: a.ticker,
        summary: a.summary ?? '',
        description: a.description ?? '',
        tags: a.tags ?? [],
        resources: a.resources ?? [],
        ...(a.image_url ? { image_url: a.image_url } : {}),
      })),
    })
  }

  const payload: VaultExport = {
    version: 1,
    app: 'warket',
    exported_at: new Date().toISOString(),
    lists: exportedLists,
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const date = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `warket-export-${date}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  return { listsExported: exportedLists.length, assetsExported: exportedLists.reduce((s, l) => s + l.assets.length, 0) }
}

/* ── Validation ─────────────────────────────────────────────── */

export function validateImportData(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid JSON structure' }

  const d = data as Record<string, unknown>

  if (typeof d.version !== 'number') return { valid: false, error: 'Missing or invalid "version" field' }
  if (!Array.isArray(d.lists)) return { valid: false, error: 'Missing "lists" array' }

  for (let i = 0; i < d.lists.length; i++) {
    const list = d.lists[i] as Record<string, unknown>
    if (typeof list.name !== 'string' || !list.name.trim()) {
      return { valid: false, error: `List ${i + 1}: missing or empty "name"` }
    }
    if (!Array.isArray(list.assets)) {
      return { valid: false, error: `List "${list.name}": missing "assets" array` }
    }
    for (let j = 0; j < (list.assets as unknown[]).length; j++) {
      const asset = (list.assets as Record<string, unknown>[])[j]
      if (typeof asset.name !== 'string' || !asset.name.trim()) {
        return { valid: false, error: `List "${list.name}", asset ${j + 1}: missing or empty "name"` }
      }
      if (typeof asset.ticker !== 'string' || !asset.ticker.trim()) {
        return { valid: false, error: `List "${list.name}", asset "${asset.name}": missing or empty "ticker"` }
      }
    }
  }

  return { valid: true }
}

/* ── Import ─────────────────────────────────────────────────── */

export async function importVault(
  db: SupabaseClient,
  vaultHash: string,
  data: VaultExport,
): Promise<{ listsImported: number; assetsImported: number }> {
  let listsImported = 0
  let assetsImported = 0

  // Fetch existing lists to determine positions and detect same-name lists
  const { data: existingLists, error: fetchErr } = await db
    .from('lists')
    .select('id, name, position')
    .eq('vault_hash', vaultHash)

  if (fetchErr) throw new Error(`Failed to read existing lists: ${fetchErr.message}`)

  const existingByName = new Map<string, { id: string; position: number }>()
  let nextListPosition = 0
  for (const l of (existingLists ?? []) as { id: string; name: string; position: number }[]) {
    existingByName.set(l.name.toLowerCase(), { id: l.id, position: l.position })
    if (l.position >= nextListPosition) nextListPosition = l.position + 1
  }

  for (const list of data.lists) {
    const match = existingByName.get(list.name.toLowerCase())
    let listId: string

    if (match) {
      // Same-name list exists — merge assets into it
      listId = match.id
    } else {
      // Create new list after all existing ones
      const { data: inserted, error: listErr } = await db
        .from('lists')
        .insert({
          vault_hash: vaultHash,
          name: list.name,
          tags: list.tags ?? [],
          position: nextListPosition++,
        })
        .select('id')
        .single()

      if (listErr) throw new Error(`Failed to import list "${list.name}": ${listErr.message}`)
      listId = inserted.id
      listsImported++
    }

    if (list.assets?.length) {
      // Get current max asset position in this list
      const { data: lastAsset } = await db
        .from('assets')
        .select('position')
        .eq('list_id', listId)
        .order('position', { ascending: false })
        .limit(1)

      let nextAssetPosition = lastAsset?.[0]?.position != null
        ? (lastAsset[0] as { position: number }).position + 1
        : 0

      const rows = list.assets.map(a => ({
        list_id: listId,
        name: a.name,
        ticker: a.ticker,
        summary: a.summary ?? '',
        description: a.description ?? '',
        tags: a.tags ?? [],
        resources: a.resources ?? [],
        image_url: a.image_url || null,
        position: nextAssetPosition++,
      }))

      const { error: assetErr } = await db.from('assets').insert(rows)
      if (assetErr) throw new Error(`Failed to import assets for "${list.name}": ${assetErr.message}`)
      assetsImported += rows.length
    }
  }

  return { listsImported, assetsImported }
}
