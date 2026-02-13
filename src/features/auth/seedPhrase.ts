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

  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return hashHex
}
