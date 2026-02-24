import { useEffect, useState } from 'react'

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handleOffline = () => {
      setIsOffline(true)
      setDismissed(false)
    }
    const handleOnline = () => {
      setIsOffline(false)
      setDismissed(false)
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (!isOffline || dismissed) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 text-sm font-medium"
      style={{
        backgroundColor: '#92400e',
        color: '#fef3c7',
        paddingTop: 'calc(0.5rem + env(safe-area-inset-top))',
      }}
    >
      <span>You're offline — some features may not work</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '1rem', lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  )
}
