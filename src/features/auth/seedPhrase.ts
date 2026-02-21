import { WORDLIST } from './wordlist'

/**
 * Generate a random 12-word seed phrase from the curated wordlist.
 */
export function generateSeedPhrase(): string {
  const words: string[] = []
  for (let i = 0; i < 12; i++) {
    const randomIndex = Math.floor(Math.random() * WORDLIST.length)
    words.push(WORDLIST[randomIndex])
  }
  return words.join(' ')
}

/**
 * Hash a seed phrase using SHA-256.
 * Normalizes input (lowercase, trim, collapse spaces) first.
 */
export async function hashSeedPhrase(phrase: string): Promise<string> {
  const normalized = phrase
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')

  const wordCount = normalized === '' ? 0 : normalized.split(' ').length
  if (wordCount !== 12) {
    throw new Error(`Seed phrase must be exactly 12 words, got ${wordCount}`)
  }

  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}

/**
 * Derive a deterministic share hash from a vault hash.
 * Uses domain separation (":share" suffix) so the share hash
 * cannot be reversed to the vault hash.
 */
export async function deriveShareHash(vaultHash: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(vaultHash + ':share')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
