import { useState } from 'react'
import { useNavigate } from 'react-router'
import { generateSeedPhrase, hashSeedPhrase } from '../features/auth/seedPhrase'

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
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-12">
          <div className="text-4xl font-bold text-white mb-2">
            track<span className="text-amber-600">.cafe</span>
          </div>
          <p className="text-zinc-400 text-sm">Secure, seed-based asset vault</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 space-y-6">
          {/* Textarea */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider">
              Seed Phrase
            </label>
            <textarea
              value={phrase}
              onChange={e => setPhrase(e.target.value)}
              placeholder="Enter or generate a 12-word seed phrase..."
              className="w-full h-24 bg-zinc-800 border border-zinc-700 rounded text-white text-sm p-3 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-600 focus:border-transparent resize-none"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGeneratePhrase}
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2 px-4 rounded transition-colors text-sm"
          >
            Generate New Seed Phrase
          </button>

          {/* Warning */}
          {showWarning && (
            <div className="bg-amber-950 border border-amber-700 rounded p-3 space-y-2">
              <p className="text-amber-100 text-sm font-medium">⚠️ Save your seed phrase</p>
              <p className="text-amber-200 text-xs">
                Write it down or store it securely. You'll need it to access your vault.
              </p>
              <button
                onClick={handleCopyPhrase}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-3 rounded transition-colors text-sm mt-2"
              >
                {copied ? '✓ Copied' : 'Copy to Clipboard'}
              </button>
            </div>
          )}

          {/* Access Vault Button */}
          <button
            onClick={handleAccessVault}
            disabled={!phrase.trim() || isLoading}
            className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded transition-colors"
          >
            {isLoading ? 'Hashing...' : 'Access Vault'}
          </button>

          {/* Hash Preview */}
          {truncatedHash && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">
                Vault Hash
              </p>
              <div className="bg-zinc-800 border border-zinc-700 rounded p-3">
                <p className="text-zinc-300 text-xs font-mono break-all">
                  {truncatedHash}
                </p>
              </div>
              <p className="text-xs text-zinc-500">
                This hash is derived from your seed phrase and is used to secure your vault.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-500 text-xs mt-8">
          Your seed phrase is never stored or transmitted.
        </p>
      </div>
    </div>
  )
}
