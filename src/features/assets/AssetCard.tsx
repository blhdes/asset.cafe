import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Asset, Resource } from '../../lib/types'
import { faviconUrl } from '../../lib/favicon'
import { toast } from '../../components/Toast'
import Modal from '../../components/Modal'
import DescriptionModal from './DescriptionModal'
import AddResourceModal from './AddResourceModal'

/* ── Deterministic gradient from ticker string ─────────── */
const TICKER_GRADIENTS = [
  'linear-gradient(135deg, #b87d1e 0%, #d4952a 100%)',
  'linear-gradient(135deg, #047857 0%, #059669 100%)',
  'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
  'linear-gradient(135deg, #6d28d9 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #be123c 0%, #e11d48 100%)',
  'linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)',
  'linear-gradient(135deg, #4338ca 0%, #6366f1 100%)',
  'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
]

function tickerGradient(ticker: string) {
  let hash = 0
  for (const ch of ticker) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  return TICKER_GRADIENTS[Math.abs(hash) % TICKER_GRADIENTS.length]
}

/* ── Default icon (globe) for failed favicons ────────────── */
function DefaultFavicon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className} style={style}>
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
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [badgeHovered, setBadgeHovered] = useState(false)

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

  /* ── Image ────────────────────────────────────────────── */
  const handleSaveImage = async (url: string) => {
    const value = url.trim() || null
    const { error } = await db
      .from('assets')
      .update({ image_url: value })
      .eq('id', asset.id)
    if (error) { toast(error.message); return }
    onUpdate({ ...asset, image_url: value ?? undefined })
    toast(value ? 'Image saved' : 'Image removed', 'success')
  }

  /* ── Render ────────────────────────────────────────────── */
  const displayTags = asset.tags?.slice(0, 3) ?? []
  const resources = asset.resources ?? []
  const displayFavicons = resources.slice(0, 3)
  const extraResourceCount = resources.length - 3

  return (
    <>
    <div className="card-surface" style={{ overflow: 'hidden' }}>
      {/* ── Collapsed row ──────────────────────────────────── */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        style={{ minHeight: 44 }}
      >
        {/* Ticker badge */}
        <span
          className="ticker-badge"
          style={{ background: asset.image_url ? 'none' : tickerGradient(asset.ticker) }}
          onMouseEnter={() => setBadgeHovered(true)}
          onMouseLeave={() => setBadgeHovered(false)}
          onClick={expanded ? (e) => { e.stopPropagation(); setImageModalOpen(true) } : undefined}
        >
          {asset.image_url ? (
            <img
              src={asset.image_url}
              alt={asset.ticker}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: 'var(--radius-md)',
                position: 'absolute',
                inset: 0,
              }}
            />
          ) : (
            asset.ticker
          )}
          {/* Edit overlay (only when expanded + hovered) */}
          {expanded && badgeHovered && (
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.55)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5" style={{ color: '#fff' }}>
                <path d="M2.5 3A1.5 1.5 0 0 0 1 4.5v7A1.5 1.5 0 0 0 2.5 13h11a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 13.5 3h-1.232a1.5 1.5 0 0 1-1.06-.44l-.72-.72A1.5 1.5 0 0 0 9.428 1.5H6.572a1.5 1.5 0 0 0-1.06.44l-.72.72A1.5 1.5 0 0 1 3.732 3H2.5ZM8 10.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
              </svg>
            </span>
          )}
        </span>

        {/* Name + ticker */}
        <div className="min-w-0 flex-1">
          <span
            className="block truncate"
            style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}
          >
            {asset.name}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            {asset.ticker}
          </span>
        </div>

        {/* Tags (desktop) */}
        <div className="hidden gap-1.5 sm:flex">
          {displayTags.map(tag => (
            <span key={tag} className="tag-display">
              {tag}
            </span>
          ))}
        </div>

        {/* Favicon stack (desktop) */}
        {resources.length > 0 && (
          <div className="hidden sm:flex favicon-stack" style={{ alignItems: 'center' }}>
            {displayFavicons.map((resource, i) => (
              <img
                key={`fav-${resource.url}-${i}`}
                src={faviconUrl(resource.url)}
                alt=""
                className="h-4 w-4"
                style={{
                  borderRadius: 'var(--radius-sm)',
                  border: '2px solid var(--surface-1)',
                }}
              />
            ))}
            {extraResourceCount > 0 && (
              <span
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--text-muted)',
                  marginLeft: 4,
                }}
              >
                +{extraResourceCount}
              </span>
            )}
          </div>
        )}

        {/* Resource count (mobile) */}
        {resources.length > 0 && (
          <span className="flex items-center gap-1 sm:hidden" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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
          className="h-4 w-4 shrink-0"
          style={{
            color: 'var(--text-muted)',
            transition: 'transform 0.3s var(--ease-out)',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>

      {/* ── Expanded panel (always rendered, CSS grid animation) */}
      <div className="grid-expand-wrapper" data-expanded={expanded}>
        <div className="grid-expand-inner">
          <div
            className="px-4 py-4 space-y-5"
            style={{
              borderTop: '1px solid var(--border-default)',
              borderLeft: '3px solid var(--accent)',
              marginLeft: '-1px',
            }}
          >
            {/* Summary */}
            {asset.summary && (
              <div>
                <h4 className="label-sm" style={{ marginBottom: 4 }}>Summary</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {asset.summary}
                </p>
              </div>
            )}

            {/* Description */}
            <div>
              <h4 className="label-sm" style={{ marginBottom: 4 }}>Description</h4>
              <button
                onClick={() => setDescModalOpen(true)}
                className="btn-ghost"
                style={{ fontSize: '0.75rem' }}
              >
                {asset.description ? 'View / Edit' : '+ Add Description'}
              </button>
            </div>

            {/* Resources */}
            <div>
              <h4 className="label-sm" style={{ marginBottom: 8 }}>
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
                <p style={{ marginBottom: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  No resources saved yet.
                </p>
              )}

              <button
                onClick={() => setResourceModalOpen(true)}
                className="btn-ghost"
                style={{ fontSize: '0.75rem' }}
              >
                + Add Resource
              </button>
            </div>

            {/* Tags */}
            <div>
              <h4 className="label-sm" style={{ marginBottom: 8 }}>Tags</h4>
              <div className="flex flex-wrap items-center gap-1.5">
                {(asset.tags ?? []).map(tag => (
                  <TagPill key={tag} tag={tag} onRemove={() => handleRemoveTag(tag)} />
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                    placeholder="add tag"
                    className="input-field"
                    style={{
                      width: '5rem',
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Delete */}
            <div
              className="flex justify-end"
              style={{
                paddingTop: 8,
                borderTop: '1px solid var(--border-default)',
              }}
            >
              {confirmDelete ? (
                <div className="flex items-center gap-2 animate-fade-in">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    Delete this asset?
                  </span>
                  <button
                    onClick={handleDelete}
                    className="btn-primary"
                    style={{
                      fontSize: '0.75rem',
                      padding: '4px 12px',
                      backgroundColor: 'var(--error)',
                    }}
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="btn-ghost"
                    style={{ fontSize: '0.75rem', padding: '4px 12px' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <DeleteTextButton onClick={() => setConfirmDelete(true)} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ── Modals (outside card-surface to avoid transform stacking context) */}
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
    <ImageUrlModal
      open={imageModalOpen}
      onClose={() => setImageModalOpen(false)}
      currentUrl={asset.image_url}
      onSave={handleSaveImage}
    />
    </>
  )
}

/* ── Delete text button (hover → error) ──────────────────── */

function DeleteTextButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--error-bg)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--radius-md)',
        padding: '4px 12px',
        fontSize: '0.75rem',
        color: hovered ? 'var(--error)' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'color 150ms var(--ease-out), background-color 150ms var(--ease-out)',
      }}
    >
      Delete asset
    </button>
  )
}

/* ── Tag pill with remove button ─────────────────────────── */

function TagPill({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  const [removeHovered, setRemoveHovered] = useState(false)

  return (
    <span
      className="flex items-center gap-1"
      style={{
        backgroundColor: 'var(--surface-2)',
        borderRadius: 'var(--radius-pill)',
        paddingLeft: 10,
        paddingRight: 6,
        paddingTop: 2,
        paddingBottom: 2,
        fontSize: '0.75rem',
        color: 'var(--text-tertiary)',
      }}
    >
      {tag}
      <button
        onClick={onRemove}
        onMouseEnter={() => setRemoveHovered(true)}
        onMouseLeave={() => setRemoveHovered(false)}
        style={{
          background: 'none',
          border: 'none',
          borderRadius: 'var(--radius-pill)',
          padding: 2,
          color: removeHovered ? 'var(--error)' : 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'color 150ms var(--ease-out)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>
    </span>
  )
}

/* ── Image URL modal ─────────────────────────────────────── */

function ImageUrlModal({
  open,
  onClose,
  currentUrl,
  onSave,
}: {
  open: boolean
  onClose: () => void
  currentUrl?: string
  onSave: (url: string) => Promise<void>
}) {
  const [url, setUrl] = useState(currentUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    if (open) {
      setUrl(currentUrl ?? '')
      setImgError(false)
    }
  }, [open, currentUrl])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await onSave(url)
    setSaving(false)
    onClose()
  }

  const handleClear = async () => {
    setSaving(true)
    await onSave('')
    setSaving(false)
    onClose()
  }

  const trimmed = url.trim()
  const showPreview = trimmed.length > 0 && !imgError

  return (
    <Modal open={open} onClose={onClose} title="Asset Image">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block label-sm">Image URL</label>
          <input
            type="url"
            value={url}
            onChange={e => { setUrl(e.target.value); setImgError(false) }}
            placeholder="https://example.com/logo.png"
            autoFocus
            className="input-field"
          />
          <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Paste a direct link to a logo or image (PNG, JPG, SVG)
          </p>
        </div>

        {showPreview && (
          <div
            className="flex items-center justify-center"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
            }}
          >
            <img
              src={trimmed}
              alt="Preview"
              style={{
                maxWidth: 80,
                maxHeight: 80,
                borderRadius: 'var(--radius-md)',
                objectFit: 'contain',
              }}
              onError={() => setImgError(true)}
            />
          </div>
        )}

        {imgError && trimmed && (
          <p style={{ fontSize: '0.75rem', color: 'var(--error)' }}>
            Could not load image from this URL
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex-1"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {currentUrl && (
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="btn-ghost"
            >
              Remove
            </button>
          )}
        </div>
      </form>
    </Modal>
  )
}

/* ── Resource row component ──────────────────────────────── */

function ResourceRow({ resource, onRemove }: { resource: Resource; onRemove: () => void }) {
  const [faviconError, setFaviconError] = useState(false)
  const [rowHovered, setRowHovered] = useState(false)
  const [linkHovered, setLinkHovered] = useState(false)
  const [deleteHovered, setDeleteHovered] = useState(false)
  const googleFavicon = faviconUrl(resource.url)

  return (
    <div
      className="group/resource flex items-center gap-2.5 rounded -mx-2"
      onMouseEnter={() => setRowHovered(true)}
      onMouseLeave={() => setRowHovered(false)}
      style={{
        padding: '6px 8px',
        backgroundColor: rowHovered ? 'var(--surface-2)' : 'transparent',
        transition: 'background-color 150ms var(--ease-out)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      {/* Favicon */}
      {!faviconError ? (
        <img
          src={googleFavicon || resource.favicon}
          alt=""
          className="h-4 w-4 shrink-0"
          style={{ borderRadius: 'var(--radius-sm)' }}
          onError={() => setFaviconError(true)}
        />
      ) : (
        <DefaultFavicon
          className="h-4 w-4 shrink-0"
          style={{ color: 'var(--text-muted)' }}
        />
      )}

      {/* Title + link */}
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setLinkHovered(true)}
        onMouseLeave={() => setLinkHovered(false)}
        className="min-w-0 flex-1 truncate"
        style={{
          fontSize: '0.875rem',
          color: linkHovered ? 'var(--accent)' : 'var(--text-secondary)',
          transition: 'color 150ms var(--ease-out)',
          textDecoration: 'none',
        }}
      >
        {resource.title}
      </a>

      {/* External link icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-3 w-3 shrink-0"
        style={{ color: 'var(--text-muted)' }}
      >
        <path d="M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06Z" />
      </svg>

      {/* Delete button */}
      <button
        onClick={e => { e.preventDefault(); onRemove() }}
        onMouseEnter={() => setDeleteHovered(true)}
        onMouseLeave={() => setDeleteHovered(false)}
        className="shrink-0"
        title="Remove resource"
        style={{
          background: 'none',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          padding: 2,
          color: deleteHovered ? 'var(--error)' : 'var(--text-muted)',
          opacity: rowHovered ? 1 : 0,
          transition: 'opacity 150ms var(--ease-out), color 150ms var(--ease-out)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
        </svg>
      </button>
    </div>
  )
}
