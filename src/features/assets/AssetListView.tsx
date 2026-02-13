import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Asset, VaultList } from '../../lib/types'
import AssetCard from './AssetCard'
import AddAssetModal from './AddAssetModal'
import { Skeleton } from '../../components/Skeleton'
import { toast } from '../../components/Toast'

interface Props {
  list: VaultList
  db: SupabaseClient
  onBack: () => void
}

export default function AssetListView({ list, db, onBack }: Props) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  /* ── Fetch ─────────────────────────────────────────────── */
  const fetchAssets = useCallback(async () => {
    const { data, error } = await db
      .from('assets')
      .select('*')
      .eq('list_id', list.id)
      .order('created_at', { ascending: false })

    if (error) {
      toast(error.message)
      setLoading(false)
      return
    }

    setAssets(data as Asset[])
    setLoading(false)
  }, [db, list.id])

  useEffect(() => { fetchAssets() }, [fetchAssets])

  /* ── Derived ───────────────────────────────────────────── */
  const allTags = useMemo(() => {
    const set = new Set<string>()
    assets.forEach(a => a.tags?.forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [assets])

  const filtered = useMemo(() => {
    let result = assets
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) || a.ticker.toLowerCase().includes(q)
      )
    }
    if (activeTag) {
      result = result.filter(a => a.tags?.includes(activeTag))
    }
    return result
  }, [assets, search, activeTag])

  /* ── Optimistic callbacks ──────────────────────────────── */
  const handleUpdate = (updated: Asset) => {
    setAssets(prev => prev.map(a => a.id === updated.id ? updated : a))
  }

  const handleDelete = (id: string) => {
    setAssets(prev => prev.filter(a => a.id !== id))
  }

  const handleCreated = (asset: Asset) => {
    setAssets(prev => [asset, ...prev])
  }

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1 rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white truncate">{list.name}</h2>
          <p className="text-xs text-zinc-500">
            {assets.length} {assets.length === 1 ? 'asset' : 'assets'}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="shrink-0 rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
        >
          + Add Asset
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or ticker..."
        className="w-full sm:w-72 rounded bg-zinc-900 border border-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
      />

      {/* Tag pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-400 transition-colors hover:text-white"
            >
              Clear
            </button>
          )}
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(prev => (prev === tag ? null : tag))}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                activeTag === tag
                  ? 'bg-amber-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 py-16 text-center">
          <p className="text-zinc-400 text-sm">
            {assets.length === 0
              ? 'No assets in this list yet.'
              : 'No assets match your search.'}
          </p>
          {assets.length === 0 && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              + Add Asset
            </button>
          )}
        </div>
      )}

      {/* Asset cards */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map(asset => (
            <AssetCard
              key={asset.id}
              asset={asset}
              db={db}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Add modal */}
      <AddAssetModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        db={db}
        listId={list.id}
        onCreated={handleCreated}
      />
    </div>
  )
}
