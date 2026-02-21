import type { Resource } from '@src/lib/types'
import rawSeedData from '../../warket-seed-data.json'

export interface MockAsset {
  name: string
  ticker: string
  summary: string
  description: string
  tags: string[]
  resources: Resource[]
  image_url?: string
}

export interface MockList {
  name: string
  tags: string[]
  assets: MockAsset[]
}

export interface MockVault {
  version: number
  app: string
  exported_at: string
  lists: MockList[]
}

/**
 * Returns a fresh deep clone of the seed data on every call.
 * Tests that mutate the vault won't affect each other.
 */
export function getMockVault(): MockVault {
  return structuredClone(rawSeedData) as MockVault
}
