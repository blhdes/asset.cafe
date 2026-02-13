import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { vaultClient } from '../lib/supabase'
import ToastContainer from '../components/Toast'
import ListsView from '../features/lists/ListsView'

export default function VaultPage() {
  const { hash } = useParams<{ hash: string }>()
  const navigate = useNavigate()
  const [supabaseError, setSupabaseError] = useState<string | null>(null)

  const storedHash = sessionStorage.getItem('vault_hash')

  useEffect(() => {
    if (!storedHash) {
      navigate('/', { replace: true })
    }
  }, [storedHash, navigate])

  const db = useMemo(() => {
    if (!hash) return null
    try {
      return vaultClient(hash)
    } catch (e) {
      setSupabaseError(e instanceof Error ? e.message : 'Failed to connect')
      return null
    }
  }, [hash])

  if (!storedHash || !hash) return null

  const truncatedHash = `${hash.slice(0, 8)}...${hash.slice(-4)}`

  const handleLock = () => {
    sessionStorage.removeItem('vault_hash')
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="text-lg font-bold text-white">
            asset<span className="text-amber-600">.cafe</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded bg-zinc-800 px-2.5 py-1 font-mono text-xs text-zinc-400">
              {truncatedHash}
            </span>
            <button
              onClick={handleLock}
              className="flex items-center gap-1.5 rounded bg-zinc-800 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-3.5 w-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                  clipRule="evenodd"
                />
              </svg>
              Lock
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {supabaseError ? (
          <div className="rounded-lg border border-red-800 bg-red-950 p-6 text-center">
            <p className="text-red-200 text-sm">{supabaseError}</p>
          </div>
        ) : db ? (
          <ListsView db={db} vaultHash={hash} />
        ) : null}
      </main>

      <ToastContainer />
    </div>
  )
}
