import { useState } from 'react'
import { useNavigate } from 'react-router'
import { generateSeedPhrase, hashSeedPhrase } from '../features/auth/seedPhrase'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

export default function LandingPage() {
  const navigate = useNavigate()
  const [phrase, setPhrase] = useState('')
  const [hash, setHash] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleGeneratePhrase = () => {
    const newPhrase = generateSeedPhrase()
    setPhrase(newPhrase)
    setHash('')
    setShowWarning(true)
    setCopied(false)
  }

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(phrase)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAccessVault = async () => {
    if (!phrase.trim()) return

    setIsLoading(true)
    try {
      const vaultHash = await hashSeedPhrase(phrase)
      setHash(vaultHash)
      sessionStorage.setItem('vault_hash', vaultHash)
      navigate(`/vault/${vaultHash}`)
    } finally {
      setIsLoading(false)
    }
  }

  const truncatedHash = hash ? `${hash.slice(0, 16)}...${hash.slice(-16)}` : ''

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundColor: 'var(--surface-0)' }}
    >
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Animated gradient background */}
      <div
        className="absolute inset-0 animate-gradient-shift"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, var(--accent-subtle) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, var(--accent-subtle) 0%, transparent 60%)',
        }}
      />

      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            `linear-gradient(var(--grid-line-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line-color) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo / Title */}
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-3 text-5xl"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            <Logo size={36} style={{ color: 'var(--accent)', opacity: 0.4 }} />
            <span><span style={{ color: 'var(--accent)' }}>w</span>arket</span>
          </div>
          <p
            className="mt-2"
            style={{
              color: 'var(--text-tertiary)',
              fontSize: '0.875rem',
              letterSpacing: '0.05em',
            }}
          >
            Your market, your vault
          </p>
        </div>

        {/* Card */}
        <div
          className="p-8 space-y-6"
          style={{
            backgroundColor: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--landing-shadow)',
          }}
        >
          {/* Textarea */}
          <div className="space-y-2">
            <label className="label-sm block">Seed Phrase</label>
            <textarea
              value={phrase}
              onChange={e => setPhrase(e.target.value)}
              placeholder="Enter or generate a 12-word seed phrase..."
              className="input-field h-24 resize-none"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          {/* Generate Button */}
          <button onClick={handleGeneratePhrase} className="btn-ghost w-full">
            Generate New Seed Phrase
          </button>

          {/* Warning */}
          {showWarning && (
            <div
              className="space-y-2"
              style={{
                backgroundColor: 'var(--accent-subtle)',
                border: '1px solid var(--accent-glow)',
                borderRadius: 'var(--radius-md)',
                padding: '12px',
              }}
            >
              <p
                style={{
                  color: 'var(--accent)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                Save your seed phrase
              </p>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                }}
              >
                Write it down or store it securely. You'll need it to access your vault.
              </p>
              <button onClick={handleCopyPhrase} className="btn-primary w-full mt-2">
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
          )}

          {/* Access Vault Button */}
          <button
            onClick={handleAccessVault}
            disabled={!phrase.trim() || isLoading}
            className="btn-primary w-full"
            style={{ padding: '12px 16px', fontSize: '0.9375rem' }}
          >
            {isLoading ? 'Hashing...' : 'Access Vault'}
          </button>

          {/* Hash Preview */}
          {truncatedHash && (
            <div className="space-y-2">
              <p className="label-sm">Vault Hash</p>
              <div
                style={{
                  backgroundColor: 'var(--surface-2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                }}
              >
                <p
                  className="break-all"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {truncatedHash}
                </p>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                This hash is derived from your seed phrase and is used to secure your vault.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p
          className="text-center mt-8"
          style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}
        >
          Your seed phrase is never stored or transmitted.
        </p>
      </div>
    </div>
  )
}
