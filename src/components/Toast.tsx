import { useState, useCallback } from 'react'

interface ToastMessage {
  id: number
  text: string
  type: 'error' | 'success'
}

let addToast: (text: string, type: 'error' | 'success') => void = () => {}

export function toast(text: string, type: 'error' | 'success' = 'error') {
  addToast(text, type)
}

let nextId = 0

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  addToast = useCallback((text: string, type: 'error' | 'success') => {
    const id = nextId++
    setToasts(prev => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg text-sm shadow-lg border animate-slide-in ${
            t.type === 'error'
              ? 'bg-red-950 border-red-800 text-red-200'
              : 'bg-emerald-950 border-emerald-800 text-emerald-200'
          }`}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}
