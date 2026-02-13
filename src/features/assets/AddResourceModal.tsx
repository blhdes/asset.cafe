import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resource, Asset } from '../../lib/types'
import { faviconUrl, extractHostname } from '../../lib/favicon'
import { fetchPageTitle } from '../../lib/fetchTitle'
import Modal from '../../components/Modal'
import { toast } from '../../components/Toast'

interface Props {
  open: boolean
  onClose: () => void
  asset: Asset
  db: SupabaseClient
  onUpdate: (updated: Asset) => void
}

export default function AddResourceModal({ open, onClose, asset, db, onUpdate }: Props) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [fetchingTitle, setFetchingTitle] = useState(false)
  const [saving, setSaving] = useState(false)

  const hostname = extractHostname(url)
  const favicon = faviconUrl(url)
  const isValidUrl = hostname !== ''

  // Auto-fetch page title whenever the URL changes
  useEffect(() => {
    setTitle('')
    setFetchingTitle(false)

    if (!isValidUrl) return

    const controller = new AbortController()
    setFetchingTitle(true)

    const timer = setTimeout(async () => {
      const fetched = await fetchPageTitle(url, controller.signal)
      if (!controller.signal.aborted) {
        if (fetched) setTitle(fetched)
        setFetchingTitle(false)
      }
    }, 600)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [url])

  const reset = () => {
    setUrl('')
    setTitle('')
    setFetchingTitle(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValidUrl) return

    const newResource: Resource = {
      title: title.trim() || url.trim(),
      url: url.trim(),
      favicon,
    }

    const updated = [...(asset.resources ?? []), newResource]

    setSaving(true)
    const { error } = await db
      .from('assets')
      .update({ resources: updated })
      .eq('id', asset.id)
    setSaving(false)

    if (error) { toast(error.message); return }

    onUpdate({ ...asset, resources: updated })
    toast('Resource added', 'success')
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Resource">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* URL */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
            URL
          </label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
            autoFocus
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
          />
          {url && !isValidUrl && (
            <p className="text-xs text-red-400">Enter a valid URL</p>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
            Title
          </label>
          <div className="relative">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={fetchingTitle ? 'Fetching page title...' : 'Page title or label'}
              className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent"
            />
            {fetchingTitle && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-amber-500" />
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        {isValidUrl && (
          <div className="flex items-center gap-2.5 rounded bg-zinc-800 border border-zinc-700 px-3 py-2.5">
            <img
              src={favicon}
              alt=""
              className="h-4 w-4 shrink-0 rounded"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-200">
                {title || url}
              </p>
              <p className="text-xs text-zinc-500">{hostname}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!isValidUrl || saving}
          className="w-full rounded bg-amber-600 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700 disabled:bg-zinc-700 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Add Resource'}
        </button>
      </form>
    </Modal>
  )
}
