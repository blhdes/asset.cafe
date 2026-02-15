import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { VaultList } from '../../lib/types'
import Modal from '../../components/Modal'
import { ListCardSkeleton } from '../../components/Skeleton'
import { toast } from '../../components/Toast'
import AssetListView from '../assets/AssetListView'

interface Props {
  db: SupabaseClient
  vaultHash: string
}

export default function ListsView({ db, vaultHash }: Props) {
  const [lists, setLists] = useState<(VaultList & { asset_count: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedList, setSelectedList] = useState<VaultList | null>(null)
  const [viewDirection, setViewDirection] = useState<'forward' | 'back'>('forward')

  /* ── Fetch ─────────────────────────────────────────────── */
  const fetchLists = useCallback(async () => {
    const { data, error } = await db
      .from('lists')
      .select('*, assets(count)')
      .eq('vault_hash', vaultHash)
      .order('created_at', { ascending: false })

    if (error) {
      toast(error.message)
      setLoading(false)
      return
    }

    const mapped = (data ?? []).map((row: any) => ({
      ...row,
      asset_count: row.assets?.[0]?.count ?? 0,
    }))

    setLists(mapped)
    setLoading(false)
  }, [db, vaultHash])

  useEffect(() => { fetchLists() }, [fetchLists])

  /* ── Derived ───────────────────────────────────────────── */
  const allTags = useMemo(() => {
    const set = new Set<string>()
    lists.forEach(l => l.tags?.forEach(t => set.add(t)))
    return Array.from(set).sort()
  }, [lists])

  const filtered = useMemo(() => {
    let result = lists
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(l => l.name.toLowerCase().includes(q))
    }
    if (activeTag) {
      result = result.filter(l => l.tags?.includes(activeTag))
    }
    return result
  }, [lists, search, activeTag])

  /* ── Create ────────────────────────────────────────────── */
  const handleCreate = async (name: string, tags: string[]) => {
    const { error } = await db
      .from('lists')
      .insert({ vault_hash: vaultHash, name, tags })

    if (error) {
      toast(error.message)
      return
    }

    toast('List created', 'success')
    setModalOpen(false)
    fetchLists()
  }

  /* ── Delete ────────────────────────────────────────────── */
  const handleDelete = async (id: string) => {
    const { error } = await db.from('lists').delete().eq('id', id)

    if (error) {
      toast(error.message)
      return
    }

    toast('List deleted', 'success')
    setLists(prev => prev.filter(l => l.id !== id))
  }

  /* ── Render ────────────────────────────────────────────── */

  if (selectedList) {
    return (
      <div className={viewDirection === 'forward' ? 'animate-view-enter' : 'animate-view-enter-back'}>
        <AssetListView
          list={selectedList}
          db={db}
          onBack={() => { setViewDirection('back'); setSelectedList(null); fetchLists() }}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-5 ${viewDirection === 'back' ? 'animate-view-enter-back' : 'animate-fade-in'}`}>
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search lists..."
          className="input-field sm:max-w-[256px]"
        />
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary shrink-0"
        >
          + New List
        </button>
      </div>

      {/* Tag pills */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="tag-pill btn-ghost"
              style={{ borderRadius: 'var(--radius-pill)' }}
            >
              Clear
            </button>
          )}
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveTag(prev => (prev === tag ? null : tag))}
              className={`tag-pill ${
                activeTag === tag
                  ? 'tag-pill-active'
                  : 'tag-pill-default'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div
          className="flex flex-col items-center py-20 text-center"
          style={{
            border: '1px dashed var(--border-default)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="mb-3"
            width={24}
            height={24}
            style={{ color: 'var(--text-muted)' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
            />
          </svg>
          <p style={{ color: 'var(--text-tertiary)' }} className="text-sm">
            {lists.length === 0
              ? 'No lists yet. Create your first one.'
              : 'No lists match your search.'}
          </p>
          {lists.length === 0 && (
            <button
              onClick={() => setModalOpen(true)}
              className="btn-primary mt-4"
            >
              + New List
            </button>
          )}
        </div>
      )}

      {/* List cards */}
      {!loading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(list => (
            <div
              key={list.id}
              onClick={() => { setViewDirection('forward'); setSelectedList(list) }}
              className="card-surface group relative cursor-pointer p-5"
            >
              {/* Delete button */}
              <button
                onClick={e => {
                  e.stopPropagation()
                  handleDelete(list.id)
                }}
                className="absolute right-3 top-3 rounded p-1 opacity-0 transition-all group-hover:opacity-100"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--error)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                title="Delete list"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .7.798l-.35 5.5a.75.75 0 0 1-1.497-.095l.35-5.5a.75.75 0 0 1 .797-.703Zm2.84 0a.75.75 0 0 1 .798.703l.35 5.5a.75.75 0 0 1-1.498.095l-.35-5.5a.75.75 0 0 1 .7-.798Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Card body */}
              <h3
                className="pr-6"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.125rem',
                  color: 'var(--text-primary)',
                }}
              >
                {list.name}
              </h3>

              {list.tags && list.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {list.tags.map(tag => (
                    <span key={tag} className="tag-display">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <p
                className="mt-3"
                style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}
              >
                {list.asset_count} {list.asset_count === 1 ? 'asset' : 'assets'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <CreateListModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}

/* ── Create List Modal ─────────────────────────────────── */

function CreateListModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, tags: string[]) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const tags = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean)

    setSaving(true)
    await onCreate(name.trim(), tags)
    setSaving(false)
    setName('')
    setTagsInput('')
  }

  return (
    <Modal open={open} onClose={onClose} title="New List">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="label-sm block">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. AI Stocks"
            autoFocus
            className="input-field"
          />
        </div>

        <div className="space-y-1.5">
          <label className="label-sm block">
            Tags
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="ai, tech, growth (comma-separated)"
            className="input-field"
          />
        </div>

        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="btn-primary w-full"
        >
          {saving ? 'Creating...' : 'Create List'}
        </button>
      </form>
    </Modal>
  )
}
