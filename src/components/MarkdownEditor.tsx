import { useRef, useCallback, type RefObject } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  textareaRef?: RefObject<HTMLTextAreaElement | null>
}

type FormatAction =
  | 'bold' | 'italic' | 'strikethrough'
  | 'heading' | 'bullet' | 'ordered' | 'quote'
  | 'code' | 'link'

export default function MarkdownEditor({ value, onChange, placeholder, textareaRef: externalRef }: Props) {
  const internalRef = useRef<HTMLTextAreaElement>(null)
  const taRef = externalRef ?? internalRef

  const applyFormat = useCallback((action: FormatAction) => {
    const ta = taRef.current
    if (!ta) return

    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = value.substring(start, end)

    let newValue: string
    let cursorStart: number
    let cursorEnd: number

    const wrapWith = (before: string, after: string) => {
      newValue = value.substring(0, start) + before + selected + after + value.substring(end)
      cursorStart = start + before.length
      cursorEnd = end + before.length
    }

    const prefixLines = (prefix: string) => {
      if (selected) {
        const lines = selected.split('\n')
        const allPrefixed = lines.every(l => l.startsWith(prefix))
        const transformed = allPrefixed
          ? lines.map(l => l.substring(prefix.length)).join('\n')
          : lines.map(l => prefix + l).join('\n')
        newValue = value.substring(0, start) + transformed + value.substring(end)
        cursorStart = start
        cursorEnd = start + transformed.length
      } else {
        const lineStart = value.lastIndexOf('\n', start - 1) + 1
        const lineEnd = value.indexOf('\n', start)
        const lineEndSafe = lineEnd === -1 ? value.length : lineEnd
        const line = value.substring(lineStart, lineEndSafe)

        if (line.startsWith(prefix)) {
          newValue = value.substring(0, lineStart) + line.substring(prefix.length) + value.substring(lineEndSafe)
          cursorStart = cursorEnd = Math.max(lineStart, start - prefix.length)
        } else {
          newValue = value.substring(0, lineStart) + prefix + value.substring(lineStart)
          cursorStart = cursorEnd = start + prefix.length
        }
      }
    }

    switch (action) {
      case 'bold':
        wrapWith('**', '**')
        break
      case 'italic':
        wrapWith('_', '_')
        break
      case 'strikethrough':
        wrapWith('~~', '~~')
        break
      case 'code':
        if (selected.includes('\n')) {
          wrapWith('```\n', '\n```')
        } else {
          wrapWith('`', '`')
        }
        break
      case 'heading':
        prefixLines('## ')
        break
      case 'bullet':
        prefixLines('- ')
        break
      case 'ordered':
        prefixLines('1. ')
        break
      case 'quote':
        prefixLines('> ')
        break
      case 'link': {
        if (selected) {
          newValue = value.substring(0, start) + `[${selected}](url)` + value.substring(end)
          cursorStart = end + 3
          cursorEnd = end + 6
        } else {
          newValue = value.substring(0, start) + '[text](url)' + value.substring(end)
          cursorStart = start + 1
          cursorEnd = start + 5
        }
        break
      }
      default:
        return
    }

    onChange(newValue!)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(cursorStart!, cursorEnd!)
    })
  }, [value, onChange, taRef])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault()
          applyFormat('bold')
          break
        case 'i':
          e.preventDefault()
          applyFormat('italic')
          break
        case 'k':
          e.preventDefault()
          applyFormat('link')
          break
      }
    }
  }, [applyFormat])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-0.5 overflow-x-auto"
        style={{
          padding: '6px 16px',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--surface-1)',
          scrollbarWidth: 'none',
          flexShrink: 0,
        }}
      >
        <TBtn onClick={() => applyFormat('bold')} title="Bold (Ctrl+B)">
          <span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>B</span>
        </TBtn>
        <TBtn onClick={() => applyFormat('italic')} title="Italic (Ctrl+I)">
          <span style={{ fontStyle: 'italic', fontSize: '0.8125rem' }}>I</span>
        </TBtn>
        <TBtn onClick={() => applyFormat('strikethrough')} title="Strikethrough">
          <span style={{ textDecoration: 'line-through', fontSize: '0.8125rem' }}>S</span>
        </TBtn>

        <TDiv />

        <TBtn onClick={() => applyFormat('heading')} title="Heading">
          <span style={{ fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '-0.02em' }}>H2</span>
        </TBtn>
        <TBtn onClick={() => applyFormat('quote')} title="Blockquote">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={14} height={14}>
            <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm4 4A.75.75 0 0 1 6.75 8h5.75a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 8.75Zm-4 4A.75.75 0 0 1 2.75 12h10.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2 8.75A.75.75 0 0 1 2.75 8h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 2 8.75Z" clipRule="evenodd" />
          </svg>
        </TBtn>

        <TDiv />

        <TBtn onClick={() => applyFormat('bullet')} title="Bullet list">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={14} height={14}>
            <path fillRule="evenodd" d="M2.5 4a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1ZM5 3.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 5 3.5ZM5 8a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 5 8Zm.75 3.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5ZM3 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0Zm-.5 5a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1Z" clipRule="evenodd" />
          </svg>
        </TBtn>
        <TBtn onClick={() => applyFormat('ordered')} title="Numbered list">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={14} height={14}>
            <path fillRule="evenodd" d="M2.003 2.5a.5.5 0 0 0-.723-.447l-1 .5a.5.5 0 0 0 .447.894l.276-.138V5.5a.5.5 0 0 0 1 0v-3ZM5 3.5a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 5 3.5ZM5 8a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 5 8Zm.75 3.75a.75.75 0 0 0 0 1.5h7.5a.75.75 0 0 0 0-1.5h-7.5ZM.753 10.192a.498.498 0 0 1 .75-.057c.177.156.496.31.747.31.26 0 .39-.126.39-.264 0-.086-.036-.217-.39-.356a4.5 4.5 0 0 1-.39-.17C1.42 9.414 1 9.04 1 8.36c0-.74.633-1.36 1.5-1.36.585 0 1.047.213 1.313.47a.5.5 0 0 1-.682.732A.966.966 0 0 0 2.5 8c-.194 0-.39.1-.39.36 0 .073.046.176.39.307.046.018.24.094.39.169.48.24.86.614.86 1.286 0 .684-.543 1.263-1.39 1.263-.657 0-1.16-.286-1.414-.536a.498.498 0 0 1-.193-.657Z" clipRule="evenodd" />
          </svg>
        </TBtn>

        <TDiv />

        <TBtn onClick={() => applyFormat('code')} title="Code">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={14} height={14}>
            <path fillRule="evenodd" d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06ZM2.22 4.22a.75.75 0 0 0-1.06 0l-1 1a.75.75 0 0 0 0 1.06L2.44 8.56.16 10.84a.75.75 0 0 0 1.06 1.06l1-1a.75.75 0 0 0 0-1.06L.44 7.56 2.22 5.28a.75.75 0 0 0 0-1.06Z" clipRule="evenodd" />
          </svg>
        </TBtn>
        <TBtn onClick={() => applyFormat('link')} title="Link (Ctrl+K)">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={14} height={14}>
            <path d="M7.775 3.275a.75.75 0 0 0 1.06 1.06l1.25-1.25a2 2 0 1 1 2.83 2.83l-2.5 2.5a2 2 0 0 1-2.83 0 .75.75 0 0 0-1.06 1.06 3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1.25 1.25Zm-.025 9.45a.75.75 0 0 0-1.06-1.06l-1.25 1.25a2 2 0 0 1-2.83-2.83l2.5-2.5a2 2 0 0 1 2.83 0 .75.75 0 0 0 1.06-1.06 3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1.25-1.25Z" />
          </svg>
        </TBtn>
      </div>

      {/* Textarea */}
      <textarea
        ref={taRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 resize-none focus:outline-none"
        style={{
          background: 'var(--surface-0)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.8125rem',
          lineHeight: '1.7',
          color: 'var(--text-secondary)',
          padding: '16px 24px',
        }}
      />
    </div>
  )
}

/* ── Toolbar Button ──────────────────────────────────────── */

function TBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: 'transparent',
        color: 'var(--text-tertiary)',
        cursor: 'pointer',
        fontFamily: 'var(--font-body)',
        flexShrink: 0,
        transition: 'color 150ms, background-color 150ms',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = 'var(--surface-2)'
        e.currentTarget.style.color = 'var(--text-primary)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.color = 'var(--text-tertiary)'
      }}
    >
      {children}
    </button>
  )
}

/* ── Toolbar Divider ─────────────────────────────────────── */

function TDiv() {
  return (
    <div
      style={{
        width: 1,
        height: 16,
        backgroundColor: 'var(--border-default)',
        margin: '0 4px',
        flexShrink: 0,
      }}
    />
  )
}
