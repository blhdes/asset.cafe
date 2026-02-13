import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Asset, Resource } from '../../lib/types'
import { faviconUrl } from '../../lib/favicon'
import { toast } from '../../components/Toast'
import DescriptionModal from './DescriptionModal'
import AddResourceModal from './AddResourceModal'

/* ── Deterministic color from ticker string ──────────────── */
const TICKER_COLORS = [
  'bg-amber-700', 'bg-emerald-700', 'bg-sky-700', 'bg-violet-700',
  'bg-rose-700', 'bg-teal-700', 'bg-indigo-700', 'bg-orange-700',
]

function tickerColor(ticker: string) {
  let hash = 0
  for (const ch of ticker) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return TICKER_COLORS[Math.abs(hash) % TICKER_COLORS.length]
}

/* ── Default icon (globe) for failed favicons ────────────── */
function DefaultFavicon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM5.404 3.089A5.51 5.51 0 0 0 2.68 6.5H4.58a10.7 10.7 0 0 1 .824-3.411Zm-.328 4.911H2.5a5.52 5.52 0 0 0 2.904 3.411A10.7 10.7 0 0 1 4.58 8h.496Zm2.424 4.5a9.28 9.28 0 0 1-1.264-3H7.5v3.928c-.17-.275-.332-.587-.5-.928Zm0-4.5H6.38a9.28 9.28 0 0 1 1.12-3.928V8Zm1 4.5c-.168.341-.33.653-.5.928V9h1.264a9.28 9.28 0 0 1-1.264 3.5Zm0-4.5V4.072c.387.748.734 1.606.98 2.528H8.5V8Zm2.016-1.5h1.9a5.51 5.51 0 0 0-2.724-3.411A10.7 10.7 0 0 1 10.516 6.5Zm0 1.5a10.7 10.7 0 0 1-.824 3.411A5.51 5.51 0 0 0 12.416 8h-1.9Z" />
    </svg>
  )
}

/* ── Props ───────────────────────────────────────────────── */
interface Props {
  asset: Asset
  db: SupabaseClient
  onUpdate: (updated: Asset) => void
  onDelete: (id: string) => void
}

export default function AssetCard({ asset, db, onUpdate, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [descModalOpen, setDescModalOpen] = useState(false)
  const [resourceModalOpen, setResourceModalOpen] = useState(false)

  /* ── Resources ─────────────────────────────────────────── */
  const handleRemoveResource = async (index: number) => {
    const updated = asset.resources.filter((_, i) => i !== index)

    const { error } = await db
      .from('assets')
      .update({ resources: updated })
      .eq('id', asset.id)

    if (error) { toast(error.message); return }
    onUpdate({ ...asset, resources: updated })
  }

  /* ── Tags CRUD ─────────────────────────────────────────── */
  const handleAddTag = async () => {
    const tag = tagInput.trim().toLowerCase()
    if (!tag || asset.tags?.includes(tag)) { setTagInput(''); return }

    const updated = [...(asset.tags ?? []), tag]

    const { error } = await db
      .from('assets')
      .update({ tags: updated })
      .eq('id', asset.id)

    if (error) { toast(error.message); return }
    onUpdate({ ...asset, tags: updated })
    setTagInput('')
  }

  const handleRemoveTag = async (tag: string) => {
    const updated = (asset.tags ?? []).filter(t => t !== tag)

    const { error } = await db
      .from('assets')
      .update({ tags: updated })
      .eq('id', asset.id)

    if (error) { toast(error.message); return }
    onUpdate({ ...asset, tags: updated })
  }

  /* ── Delete ────────────────────────────────────────────── */
  const handleDelete = async () => {
    const { error } = await db.from('assets').delete().eq('id', asset.id)
    if (error) { toast(error.message); return }
    onDelete(asset.id)
    toast('Asset deleted', 'success')
  }

  /* ── Render ────────────────────────────────────────────── */
  const displayTags = asset.tags?.slice(0, 3) ?? []
  const resources = asset.resources ?? []

  return (
    <div className="border border-zinc-800 rounded-lg bg-zinc-900 transition-colors hover:border-zinc-700">
      {/* ── Collapsed row ──────────────────────────────────── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* Ticker badge */}
        <span className={`${tickerColor(asset.ticker)} shrink-0 flex h-9 w-9 items-center justify-center rounded text-xs font-bold text-white uppercase`}>
          {asset.ticker.slice(0, 3)}
        </span>

        {/* Name + ticker */}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">
            {asset.name}
          </span>
          <span className="text-xs text-zinc-500 uppercase">{asset.ticker}</span>
        </div>

        {/* Tags (collapsed) */}
        <div className="hidden gap-1.5 sm:flex">
          {displayTags.map(tag => (
            <span key={tag} className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
              {tag}
            </span>
          ))}
        </div>

        {/* Resource count */}
        {resources.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M2 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4Zm2-.5a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5V4a.5.5 0 0 0-.5-.5H4Zm1 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 5.5Zm0 2a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1h-5A.5.5 0 0 1 5 7.5Zm0 2a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3A.5.5 0 0 1 5 9.5Z" />
            </svg>
            {resources.length}
          </span>
        )}

        {/* Chevron */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* ── Modals ─────────────────────────────────────────── */}
      <DescriptionModal
        open={descModalOpen}
        onClose={() => setDescModalOpen(false)}
        asset={asset}
        db={db}
        onUpdate={onUpdate}
      />
      <AddResourceModal
        open={resourceModalOpen}
        onClose={() => setResourceModalOpen(false)}
        asset={asset}
        db={db}
        onUpdate={onUpdate}
      />

      {/* ── Expanded panel ─────────────────────────────────── */}
      {expanded && (
        <div className="border-t border-zinc-800 px-4 py-4 space-y-5">
          {/* Summary */}
          {asset.summary && (
            <div>
              <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Summary</h4>
              <p className="text-sm text-zinc-300 leading-relaxed">{asset.summary}</p>
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Description</h4>
            <button
              onClick={() => setDescModalOpen(true)}
              className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
            >
              {asset.description ? 'View / Edit' : '+ Add Description'}
            </button>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
              Resources ({resources.length})
            </h4>

            {resources.length > 0 ? (
              <div className="space-y-0.5 mb-3">
                {resources.map((resource, i) => (
                  <ResourceRow
                    key={`${resource.url}-${i}`}
                    resource={resource}
                    onRemove={() => handleRemoveResource(i)}
                  />
                ))}
              </div>
            ) : (
              <p className="mb-3 text-xs text-zinc-600">No resources saved yet.</p>
            )}

            <button
              onClick={() => setResourceModalOpen(true)}
              className="rounded bg-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
            >
              + Add Resource
            </button>
          </div>

          {/* Tags */}
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Tags</h4>
            <div className="flex flex-wrap items-center gap-1.5">
              {(asset.tags ?? []).map(tag => (
                <span key={tag} className="group/tag flex items-center gap-1 rounded-full bg-zinc-800 pl-2.5 pr-1.5 py-0.5 text-xs text-zinc-400">
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="rounded-full p-0.5 text-zinc-600 transition-colors hover:text-red-400"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                    </svg>
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                  placeholder="add tag"
                  className="w-20 rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-600"
                />
              </div>
            </div>
          </div>

          {/* Delete */}
          <div className="flex justify-end pt-2 border-t border-zinc-800">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Delete this asset?</span>
                <button
                  onClick={handleDelete}
                  className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-700"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded px-3 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-red-400"
              >
                Delete asset
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Resource row component ──────────────────────────────── */

function ResourceRow({ resource, onRemove }: { resource: Resource; onRemove: () => void }) {
  const [faviconError, setFaviconError] = useState(false)
  const googleFavicon = faviconUrl(resource.url)

  return (
    <div className="group/resource flex items-center gap-2.5 rounded px-2 py-1.5 -mx-2 transition-colors hover:bg-zinc-800/60">
      {/* Favicon */}
      {!faviconError ? (
        <img
          src={googleFavicon || resource.favicon}
          alt=""
          className="h-4 w-4 shrink-0 rounded"
          onError={() => setFaviconError(true)}
        />
      ) : (
        <DefaultFavicon className="h-4 w-4 shrink-0 text-zinc-600" />
      )}

      {/* Title + link */}
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="min-w-0 flex-1 truncate text-sm text-zinc-300 hover:text-amber-500 transition-colors"
      >
        {resource.title}
      </a>

      {/* External link icon */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3 shrink-0 text-zinc-600">
        <path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06Z" />
      </svg>

      {/* Delete button */}
      <button
        onClick={e => { e.preventDefault(); onRemove() }}
        className="shrink-0 rounded p-0.5 text-zinc-600 opacity-0 transition-all hover:text-red-400 group-hover/resource:opacity-100"
        title="Remove resource"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>
    </div>
  )
}
