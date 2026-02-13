import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Asset, Resource } from '../../lib/types'
import { faviconUrl, extractHostname } from '../../lib/favicon'
import { fetchPageTitle } from '../../lib/fetchTitle'
import Modal from '../../components/Modal'
import { toast } from '../../components/Toast'

interface Props {
  open: boolean
  onClose: () => void
  db: SupabaseClient
  listId: string
  onCreated: (asset: Asset) => void
}

export default function AddAssetModal({ open, onClose, db, listId, onCreated }: Props) {
  const [name, setName] = useState('')
  const [ticker, setTicker] = useState('')
  const [summary, setSummary] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [saving, setSaving] = useState(false)

  // ── Resource gathering state ─────────────────────────────
  const [resources, setResources] = useState<Resource[]>([])
  const [resUrl, setResUrl] = useState('')
  const [resTitle, setResTitle] = useState('')
  const [fetchingTitle, setFetchingTitle] = useState(false)

  const hostname = extractHostname(resUrl)
  const isValidUrl = hostname !== ''
  const favicon = faviconUrl(resUrl)

  // Auto-fetch page title whenever the URL changes
  useEffect(() => {
    setResTitle('')
    setFetchingTitle(false)

    if (!isValidUrl) return

    const controller = new AbortController()
    setFetchingTitle(true)

    const timer = setTimeout(async () => {
      const title = await fetchPageTitle(resUrl, controller.signal)
      if (!controller.signal.aborted) {
        if (title) setResTitle(title)
        setFetchingTitle(false)
      }
    }, 600)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [resUrl])

  const resetResourceInputs = () => {
    setResUrl('')
    setResTitle('')
    setFetchingTitle(false)
  }

  const handleAddResource = () => {
    if (!isValidUrl) return

    const newResource: Resource = {
      title: resTitle.trim() || resUrl.trim(),
      url: resUrl.trim(),
      favicon,
    }
    setResources(prev => [...prev, newResource])
    resetResourceInputs()
  }

  const handleRemoveResource = (index: number) => {
    setResources(prev => prev.filter((_, i) => i !== index))
  }

  const reset = () => {
    setName(''); setTicker(''); setSummary('')
    setTagsInput(''); setResources([])
    resetResourceInputs()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !ticker.trim()) return

    const tags = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean)

    setSaving(true)
    const { data, error } = await db
      .from('assets')
      .insert({
        list_id: listId,
        name: name.trim(),
        ticker: ticker.trim().toUpperCase(),
        summary: summary.trim(),
        tags,
        resources,
      })
      .select()
      .single()

    setSaving(false)

    if (error) {
      toast(error.message)
      return
    }

    toast('Asset added', 'success')
    onCreated(data as Asset)
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Asset">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. NVIDIA Corporation"
            autoFocus
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
          />
        </div>

        {/* Ticker */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
            Ticker
          </label>
          <input
            type="text"
            value={ticker}
            onChange={e => setTicker(e.target.value)}
            placeholder="e.g. NVDA"
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent uppercase"
          />
        </div>

        {/* Summary */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
              Summary
            </label>
            <span className={`text-xs ${summary.length > 250 ? 'text-red-400' : 'text-zinc-500'}`}>
              {summary.length}/250
            </span>
          </div>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            maxLength={250}
            rows={3}
            placeholder="Brief description (max 250 chars)"
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent resize-none"
          />
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
            Tags
          </label>
          <input
            type="text"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="ai, gpu, growth (comma-separated)"
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
          />
        </div>

        {/* ── Resources section ─────────────────────────────── */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
            Resources <span className="text-zinc-500 normal-case">({resources.length} added)</span>
          </label>

          {/* List of added resources */}
          {resources.length > 0 && (
            <div className="space-y-1 rounded bg-zinc-800/50 border border-zinc-700/50 p-2">
              {resources.map((res, i) => (
                <div
                  key={`${res.url}-${i}`}
                  className="flex items-center gap-2 rounded px-2 py-1.5 transition-colors hover:bg-zinc-800"
                >
                  <img
                    src={res.favicon}
                    alt=""
                    className="h-4 w-4 shrink-0 rounded"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">
                    {res.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveResource(i)}
                    className="shrink-0 rounded p-0.5 text-zinc-600 transition-colors hover:text-red-400"
                    title="Remove"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* URL input */}
          <input
            type="url"
            value={resUrl}
            onChange={e => setResUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
          />

          {/* Title input (shown when URL is valid) */}
          {isValidUrl && (
            <>
              <div className="relative">
                <input
                  type="text"
                  value={resTitle}
                  onChange={e => setResTitle(e.target.value)}
                  placeholder={fetchingTitle ? 'Fetching page title...' : 'Page title or label'}
                  className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
                />
                {fetchingTitle && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-500" />
                  </div>
                )}
              </div>

              {/* Preview card */}
              <div className="flex items-center gap-2.5 rounded bg-zinc-800 border border-zinc-700 px-3 py-2.5">
                <img
                  src={favicon}
                  alt=""
                  className="h-4 w-4 shrink-0 rounded"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-200">
                    {resTitle || resUrl}
                  </p>
                  <p className="text-xs text-zinc-500">{hostname}</p>
                </div>
              </div>

              {/* Add resource button */}
              <button
                type="button"
                onClick={handleAddResource}
                className="rounded bg-zinc-700 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-600 hover:text-white"
              >
                + Add Resource
              </button>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={!name.trim() || !ticker.trim() || saving}
          className="w-full rounded bg-amber-600 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:bg-zinc-700 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Add Asset'}
        </button>
      </form>
    </Modal>
  )
}
