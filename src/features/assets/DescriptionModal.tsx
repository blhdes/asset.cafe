import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Asset } from '../../lib/types'
import { marked } from 'marked'
import { toast } from '../../components/Toast'
import MarkdownEditor from '../../components/MarkdownEditor'

marked.setOptions({
  breaks: true,
  gfm: true,
})

interface Props {
  open: boolean
  onClose: () => void
  asset: Asset
  db: SupabaseClient
  onUpdate: (updated: Asset) => void
}

export default function DescriptionModal({ open, onClose, asset, db, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(asset.description ?? '')
  const [saving, setSaving] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [closeHovered, setCloseHovered] = useState(false)

  /* ── Swipe-to-dismiss refs ───────────────────────────────── */
  const dragStartY = useRef<number | null>(null)
  const currentDragY = useRef(0)

  // Sync draft when asset changes or modal opens
  useEffect(() => {
    if (open) setDraft(asset.description ?? '')
  }, [open, asset.description])

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      )
    }
  }, [editing])

  // ESC to close
  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editing) { setEditing(false) }
        else onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, editing, onClose])

  /* ── Swipe-to-dismiss (mobile) ─────────────────────────── */
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    currentDragY.current = 0
    if (panelRef.current) {
      panelRef.current.style.transition = 'none'
    }
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (dragStartY.current === null) return
    const delta = e.touches[0].clientY - dragStartY.current
    if (delta > 0) {
      currentDragY.current = delta
      if (panelRef.current) {
        panelRef.current.style.transform = `translateY(${delta}px)`
      }
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    if (panelRef.current) {
      panelRef.current.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
      if (currentDragY.current > 80) {
        panelRef.current.style.transform = 'translateY(100%)'
        setTimeout(onClose, 200)
      } else {
        panelRef.current.style.transform = 'translateY(0)'
      }
    }
    dragStartY.current = null
    currentDragY.current = 0
  }, [onClose])

  if (!open) return null

  const handleSave = async () => {
    setSaving(true)
    const { error } = await db
      .from('assets')
      .update({ description: draft })
      .eq('id', asset.id)
    setSaving(false)

    if (error) { toast(error.message); return }

    onUpdate({ ...asset, description: draft })
    toast('Description saved', 'success')
    setEditing(false)
  }

  const handleDiscard = () => {
    setDraft(asset.description ?? '')
    setEditing(false)
  }

  const renderedHtml = marked.parse(asset.description ?? '') as string

  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        ref={panelRef}
        className="animate-modal-sheet modal-panel flex flex-col w-full"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-hover)',
          borderRadius: '16px 16px 0 0',
          height: '90vh',
          maxWidth: '56rem',
        }}
      >
        {/* ── Mobile sheet handle (swipe target) ───────────────── */}
        <div
          className="sm:hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: 'none' }}
        >
          <div className="sheet-handle" />
        </div>

        {/* ── Header ─────────────────────────────────────────── */}
        <div
          className="flex shrink-0 items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-default)' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="min-w-0">
            <h2
              className="truncate"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.125rem',
                color: 'var(--text-primary)',
              }}
            >
              {asset.name}
            </h2>
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

          <div className="flex items-center gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="btn-ghost"
                style={{ fontSize: '0.8125rem' }}
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={handleDiscard}
                  className="btn-ghost"
                  style={{ fontSize: '0.8125rem' }}
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary"
                  style={{ fontSize: '0.8125rem' }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              onMouseEnter={() => setCloseHovered(true)}
              onMouseLeave={() => setCloseHovered(false)}
              className="ml-2 rounded p-1"
              style={{
                color: closeHovered ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────── */}
        <div className="min-h-0 flex-1 overflow-hidden">
          {!editing ? (
            /* View mode */
            <div className="h-full overflow-y-auto px-6 py-5">
              {asset.description ? (
                <div
                  className="prose-custom"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    No description yet.{' '}
                    <button
                      onClick={() => setEditing(true)}
                      style={{ color: 'var(--accent)' }}
                    >
                      Add one
                    </button>
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Edit mode with markdown toolbar */
            <MarkdownEditor
              value={draft}
              onChange={setDraft}
              placeholder="Write your description in markdown..."
              textareaRef={textareaRef}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
