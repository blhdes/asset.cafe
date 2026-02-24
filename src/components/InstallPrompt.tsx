import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
}

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOS, setShowIOS] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('warket-pwa-dismissed') || isStandalone()) return

    if (isIOS()) {
      setShowIOS(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    localStorage.setItem('warket-pwa-dismissed', 'true')
    setDeferredPrompt(null)
    setShowIOS(false)
  }

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') dismiss()
    else setDeferredPrompt(null)
  }

  if (!deferredPrompt && !showIOS) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3 text-sm"
      style={{
        backgroundColor: 'var(--surface-1)',
        borderTop: '1px solid var(--border)',
        color: 'var(--text-primary)',
        paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>
        {showIOS
          ? 'Tap Share then "Add to Home Screen" to install'
          : 'Install warket for quick access'}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {deferredPrompt && (
          <button
            onClick={install}
            className="rounded px-3 py-1 text-sm font-medium"
            style={{ backgroundColor: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1 }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
