import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const dragStartY = useRef<number | null>(null)
  const currentDragY = useRef(0)

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

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

  return createPortal(
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-modal-backdrop"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        ref={panelRef}
        className="animate-modal-sheet modal-panel w-full sm:max-w-md"
        style={{
          backgroundColor: 'var(--surface-1)',
          border: '1px solid var(--border-hover)',
          borderRadius: '16px 16px 0 0',
          boxShadow: '0 -8px 40px -12px rgba(0,0,0,0.5)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Mobile drag zone (handle + acts as swipe target) */}
        <div
          className="sm:hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: 'none' }}
        >
          <div className="sheet-handle" />
        </div>

        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-default)' }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="transition-colors text-xl leading-none"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-tertiary)')}
          >
            &times;
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
