import { describe, it, expect, beforeEach } from 'vitest'
import { Temporal } from '@js-temporal/polyfill'
import { importVault } from '@src/lib/vaultExport'
import { getMockVault, type MockVault } from '@src/test/fixtures'
import { createStore, createMockSupabase, type MockStore, type StoredAsset } from '@src/test/mockSupabase'

// 64-char hex string — a plausible vault_hash in tests
const VAULT_HASH = 'a'.repeat(64)

// IDs used when pre-populating the store in merge tests
const PRE_LIST_A_ID = 'pre-list-a'
const PRE_LIST_B_ID = 'pre-list-b'

/**
 * Reconstructs a VaultExport-shaped object from mock store state.
 * Mirrors the data transformation inside exportVault without its DOM side
 * effects (Blob, createObjectURL, anchor click). This makes round-trip testing
 * possible without touching the browser environment.
 */
function extractVaultExport(store: MockStore, vaultHash: string): MockVault {
  const lists = store.lists
    .filter(l => l.vault_hash === vaultHash)
    .sort((a, b) => a.position - b.position)

  return {
    version: 1,
    app: 'warket',
    exported_at: Temporal.Now.instant().toString(),
    lists: lists.map(list => ({
      name: list.name,
      tags: list.tags,
      assets: store.assets
        .filter(a => a.list_id === list.id)
        .sort((a, b) => a.position - b.position)
        .map(({ name, ticker, summary, description, tags, resources, image_url }) => ({
          name,
          ticker,
          summary,
          description,
          tags,
          resources,
          ...(image_url ? { image_url } : {}),
        })),
    })),
  }
}

// ── Round-trip ────────────────────────────────────────────────────────────────

describe('importVault – round-trip', () => {
  it('serialising twice produces identical list content', async () => {
    const fixture = getMockVault()

    // Phase 1: import the gold-standard fixture into an empty vault
    const storeA = createStore()
    await importVault(createMockSupabase(storeA), VAULT_HASH, fixture)
    const exportA = extractVaultExport(storeA, VAULT_HASH)

    // Phase 2: import the extracted export into a second empty vault
    const storeB = createStore()
    await importVault(createMockSupabase(storeB), VAULT_HASH, exportA)
    const exportB = extractVaultExport(storeB, VAULT_HASH)

    // The serialisable content must survive the cycle unchanged.
    // exported_at differs by design (generated at call time) so we compare lists only.
    expect(exportB.lists).toEqual(exportA.lists)
  })

  it('imports every list and asset from the fixture', async () => {
    const fixture = getMockVault()
    const store = createStore()
    const result = await importVault(createMockSupabase(store), VAULT_HASH, fixture)

    const expectedAssets = fixture.lists.reduce((n, l) => n + l.assets.length, 0)

    expect(result.listsImported).toBe(fixture.lists.length)
    expect(result.assetsImported).toBe(expectedAssets)
    expect(store.lists).toHaveLength(fixture.lists.length)
    expect(store.assets).toHaveLength(expectedAssets)
  })

  it('assigns sequential positions to lists starting at 0', async () => {
    const fixture = getMockVault()
    const store = createStore()
    await importVault(createMockSupabase(store), VAULT_HASH, fixture)

    const positions = store.lists
      .sort((a, b) => a.position - b.position)
      .map(l => l.position)

    expect(positions).toEqual(fixture.lists.map((_, i) => i))
  })

  it('assigns sequential positions to assets within each list starting at 0', async () => {
    const fixture = getMockVault()
    const store = createStore()
    await importVault(createMockSupabase(store), VAULT_HASH, fixture)

    for (const list of store.lists) {
      const positions = store.assets
        .filter(a => a.list_id === list.id)
        .sort((a, b) => a.position - b.position)
        .map(a => a.position)

      expect(positions).toEqual(positions.map((_, i) => i))
    }
  })

  it('created_at timestamps are valid Temporal.Instant strings', async () => {
    const fixture = getMockVault()
    const store = createStore()
    await importVault(createMockSupabase(store), VAULT_HASH, fixture)

    for (const asset of store.assets) {
      // Temporal.Instant.from throws if the string is not a valid ISO 8601 instant
      expect(() => Temporal.Instant.from(asset.created_at)).not.toThrow()
    }
  })
})

// ── Merge ─────────────────────────────────────────────────────────────────────

describe('importVault – merge', () => {
  let store: MockStore
  let fixture: MockVault

  beforeEach(() => {
    fixture = getMockVault()
    store = createStore()

    // Pre-populate with the first two fixture lists using known IDs so that
    // merge tests can assert on ID preservation without depending on counters.
    const [listA, listB] = fixture.lists

    store.lists.push(
      { id: PRE_LIST_A_ID, vault_hash: VAULT_HASH, name: listA.name, tags: listA.tags, position: 0 },
      { id: PRE_LIST_B_ID, vault_hash: VAULT_HASH, name: listB.name, tags: listB.tags, position: 1 },
    )

    const seedAssets = (listId: string, assets: MockVault['lists'][number]['assets']) => {
      assets.forEach((a, i) => {
        store.assets.push({
          id: `${listId}-asset-${i}`,
          list_id: listId,
          name: a.name,
          ticker: a.ticker,
          summary: a.summary,
          description: a.description,
          tags: a.tags,
          resources: a.resources,
          image_url: null,
          position: i,
          created_at: Temporal.Now.instant().toString(),
        })
      })
    }

    seedAssets(PRE_LIST_A_ID, listA.assets)
    seedAssets(PRE_LIST_B_ID, listB.assets)
  })

  it('does not create duplicate lists for same-name matches', async () => {
    await importVault(createMockSupabase(store), VAULT_HASH, fixture)

    expect(store.lists).toHaveLength(fixture.lists.length)

    for (const { name } of fixture.lists) {
      const count = store.lists.filter(l => l.name === name).length
      expect(count).toBe(1)
    }
  })

  it('preserves the original IDs of matched lists', async () => {
    await importVault(createMockSupabase(store), VAULT_HASH, fixture)

    const [listA, listB] = fixture.lists
    expect(store.lists.find(l => l.name === listA.name)!.id).toBe(PRE_LIST_A_ID)
    expect(store.lists.find(l => l.name === listB.name)!.id).toBe(PRE_LIST_B_ID)
  })

  it('counts only newly created lists in listsImported', async () => {
    const result = await importVault(createMockSupabase(store), VAULT_HASH, fixture)

    // 2 pre-existing lists are merged — only the remaining 9 are "imported"
    expect(result.listsImported).toBe(fixture.lists.length - 2)
  })

  it('counts all assets (merged and new) in assetsImported', async () => {
    const result = await importVault(createMockSupabase(store), VAULT_HASH, fixture)

    const total = fixture.lists.reduce((n, l) => n + l.assets.length, 0)
    expect(result.assetsImported).toBe(total)
  })

  it('appends imported assets after the existing position ceiling', async () => {
    const [listA] = fixture.lists
    const originalCount = listA.assets.length

    await importVault(createMockSupabase(store), VAULT_HASH, fixture)

    const allAssets: StoredAsset[] = store.assets
      .filter(a => a.list_id === PRE_LIST_A_ID)
      .sort((a, b) => a.position - b.position)

    // Original assets + one full copy of the same list imported again
    expect(allAssets).toHaveLength(originalCount * 2)

    // Original assets occupy positions 0 … originalCount-1 (unchanged)
    expect(allAssets.slice(0, originalCount).map(a => a.position))
      .toEqual(Array.from({ length: originalCount }, (_, i) => i))

    // Imported assets continue from originalCount … 2*originalCount-1
    expect(allAssets.slice(originalCount).map(a => a.position))
      .toEqual(Array.from({ length: originalCount }, (_, i) => originalCount + i))
  })

  it('places new lists at positions immediately after all pre-existing ones', async () => {
    await importVault(createMockSupabase(store), VAULT_HASH, fixture)

    const [listA, listB] = fixture.lists
    const newLists = store.lists
      .filter(l => l.name !== listA.name && l.name !== listB.name)
      .sort((a, b) => a.position - b.position)

    // New lists start at position 2 (after the pre-existing positions 0 and 1)
    expect(newLists[0].position).toBe(2)
    expect(newLists.map(l => l.position))
      .toEqual(Array.from({ length: newLists.length }, (_, i) => i + 2))
  })
})
