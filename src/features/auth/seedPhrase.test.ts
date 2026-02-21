import { describe, it, expect } from 'vitest'
import { generateSeedPhrase, hashSeedPhrase, deriveShareHash } from '@src/features/auth/seedPhrase'

describe('generateSeedPhrase', () => {
  it('returns exactly 12 words', () => {
    const phrase = generateSeedPhrase()
    expect(phrase.split(' ')).toHaveLength(12)
  })
})

describe('hashSeedPhrase', () => {
  it('produces a 64-character hex string', async () => {
    const hash = await hashSeedPhrase('test phrase with words')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic', async () => {
    const a = await hashSeedPhrase('hello world')
    const b = await hashSeedPhrase('hello world')
    expect(a).toBe(b)
  })

  it('normalizes whitespace and case', async () => {
    const a = await hashSeedPhrase('  Hello  World  ')
    const b = await hashSeedPhrase('hello world')
    expect(a).toBe(b)
  })
})

describe('deriveShareHash', () => {
  it('differs from the vault hash', async () => {
    const vaultHash = await hashSeedPhrase('test phrase')
    const shareHash = await deriveShareHash(vaultHash)
    expect(shareHash).not.toBe(vaultHash)
    expect(shareHash).toMatch(/^[0-9a-f]{64}$/)
  })
})
