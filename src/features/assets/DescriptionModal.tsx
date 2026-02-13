import { useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Asset } from '../../lib/types'
import { marked } from 'marked'
import { toast } from '../../components/Toast'

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
  const [showPreview, setShowPreview] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
        if (editing) { setEditing(false); setShowPreview(false) }
        else onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, editing, onClose])

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
    setShowPreview(false)
  }

  const handleDiscard = () => {
    setDraft(asset.description ?? '')
    setEditing(false)
    setShowPreview(false)
  }

  const renderedHtml = marked.parse(editing ? draft : (asset.description ?? '')) as string

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-white">{asset.name}</h2>
            <span className="text-xs text-zinc-500 uppercase">{asset.ticker}</span>
          </div>

          <div className="flex items-center gap-2">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className={`rounded px-3 py-1.5 text-sm transition-colors ${
                    showPreview
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={handleDiscard}
                  className="rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded bg-amber-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="ml-2 rounded p-1 text-zinc-400 transition-colors hover:text-white"
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
                  <p className="text-sm text-zinc-500">
                    No description yet.{' '}
                    <button
                      onClick={() => setEditing(true)}
                      className="text-amber-500 hover:text-amber-400 transition-colors"
                    >
                      Add one
                    </button>
                  </p>
                </div>
              )}
            </div>
          ) : showPreview ? (
            /* Edit + preview side by side */
            <div className="flex h-full">
              <div className="flex-1 border-r border-zinc-800">
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  className="h-full w-full resize-none bg-zinc-950 px-6 py-5 font-mono text-sm leading-relaxed text-zinc-200 placeholder-zinc-600 focus:outline-none"
                  placeholder="Write your description in markdown..."
                />
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <div
                  className="prose-custom"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>
            </div>
          ) : (
            /* Edit only */
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="h-full w-full resize-none bg-zinc-950 px-6 py-5 font-mono text-sm leading-relaxed text-zinc-200 placeholder-zinc-600 focus:outline-none"
              placeholder="Write your description in markdown..."
            />
          )}
        </div>
      </div>
    </div>
  )
}
