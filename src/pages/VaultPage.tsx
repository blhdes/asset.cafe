import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { vaultClient } from '../lib/supabase'
import ToastContainer from '../components/Toast'
import ListsView from '../features/lists/ListsView'
import Logo from '../components/Logo'

export default function VaultPage() {
  const { hash } = useParams<{ hash: string }>()
  const navigate = useNavigate()
  const [supabaseError, setSupabaseError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [listKey, setListKey] = useState(0)

  const storedHash = sessionStorage.getItem('vault_hash')

  const handleCopyHash = () => {
    navigator.clipboard.writeText(hash!)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface-0)' }}>
      <div className="decorative-bg" />

      {/* Header */}
      <header
        className="sticky top-0 z-40 gradient-border-bottom"
        style={{
          backgroundColor: 'rgba(8, 9, 13, 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="mx-auto flex h-14 items-center justify-between px-4" style={{ maxWidth: '960px' }}>
          <button
            onClick={() => setListKey(k => k + 1)}
            className="flex items-center gap-2 text-lg"
            style={{
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <Logo size={18} style={{ color: 'var(--accent)', opacity: 0.45 }} />
            <span>asset<span style={{ color: 'var(--accent)' }}>.cafe</span></span>
          </button>

          <div className="flex items-center gap-3">
            {/* Desktop session badge */}
            <button
              className="session-badge hidden sm:inline-flex"
              onClick={handleCopyHash}
            >
              {copied ? 'Copied!' : truncatedHash}
            </button>

            {/* Mobile session badge */}
            <button
              className="session-badge sm:hidden flex items-center justify-center"
              onClick={handleCopyHash}
              style={{ width: '32px', height: '32px', padding: 0 }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  fillRule="evenodd"
                  d="M15.988 3.012A2.25 2.25 0 0 1 18 5.25v6.5A2.25 2.25 0 0 1 15.75 14H13.5v-2h2.25a.25.25 0 0 0 .25-.25v-6.5a.25.25 0 0 0-.25-.25h-6.5a.25.25 0 0 0-.25.25V7.5h-2V5.25a2.25 2.25 0 0 1 2.25-2.238h6.738ZM4.25 8A2.25 2.25 0 0 0 2 10.25v4.5A2.25 2.25 0 0 0 4.25 17h6.5A2.25 2.25 0 0 0 13 14.75v-4.5A2.25 2.25 0 0 0 10.75 8h-6.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* Lock button */}
            <button
              onClick={handleLock}
              className="btn-ghost flex items-center gap-1.5"
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
              <span className="hidden sm:inline">Lock</span>
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto px-4 py-6" style={{ maxWidth: '960px' }}>
        {supabaseError ? (
          <div
            className="p-6 text-center"
            style={{
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--error-border)',
              backgroundColor: 'var(--error-bg)',
              color: 'var(--error)',
              fontSize: '0.875rem',
            }}
          >
            <p>{supabaseError}</p>
          </div>
        ) : db ? (
          <ListsView key={listKey} db={db} vaultHash={hash} />
        ) : null}
      </main>

      <ToastContainer />
    </div>
  )
}
