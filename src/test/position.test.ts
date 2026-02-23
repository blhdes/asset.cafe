import { describe, it, expect } from 'vitest'
import { calculateInsertPosition, updatePositions } from '@src/lib/position'
import { getMockVault } from '@src/test/fixtures'
import { createStore, createMockSupabase } from '@src/test/mockSupabase'

// Five real assets from the fixture's first list, assigned sequential positions.
// Using the ticker as the item ID — unique and human-readable in assertion output.
const vault = getMockVault()
const ITEMS = vault.lists[0].assets.slice(0, 5).map((a, i) => ({
  id: a.ticker,
  name: a.name,
  position: i,
}))

// ── calculateInsertPosition ───────────────────────────────────────────────────

describe('calculateInsertPosition', () => {
  it('initial state: items have sequential integer positions starting at 0', () => {
    expect(ITEMS.map(i => i.position)).toEqual([0, 1, 2, 3, 4])
  })

  it('move to start: returns a position strictly lower than the current minimum', () => {
    const newPos = calculateInsertPosition(ITEMS, 0)

    expect(newPos).toBeLessThan(ITEMS[0].position)         // < 0
    expect(newPos).toBe(ITEMS[0].position - 1)             // exactly -1
  })

  it('move to end: returns a position strictly higher than the current maximum', () => {
    const newPos = calculateInsertPosition(ITEMS, ITEMS.length)

    expect(newPos).toBeGreaterThan(ITEMS[ITEMS.length - 1].position)   // > 4
    expect(newPos).toBe(ITEMS[ITEMS.length - 1].position + 1)          // exactly 5
  })

  it('mid-list insertion between index 2 and 3: returns the exact midpoint', () => {
    // toIndex=3 means "insert before ITEMS[3]", so neighbours are ITEMS[2] and ITEMS[3]
    const newPos = calculateInsertPosition(ITEMS, 3)

    const expectedMidpoint = (ITEMS[2].position + ITEMS[3].position) / 2   // (2+3)/2 = 2.5
    expect(newPos).toBe(expectedMidpoint)
    expect(newPos).toBeGreaterThan(ITEMS[2].position)
    expect(newPos).toBeLessThan(ITEMS[3].position)
  })
})

// ── updatePositions ───────────────────────────────────────────────────────────

describe('updatePositions', () => {
  it('persists a calculated position to the store without touching other items', async () => {
    // Pre-populate the mock store with the 5 seed items
    const store = createStore()
    for (const item of ITEMS) {
      store.lists.push({
        id: item.id,
        vault_hash: 'test',
        name: item.name,
        tags: [],
        position: item.position,
      })
    }

    const db = createMockSupabase(store)

    // Simulate dragging the last item (ITEMS[4]) to the start
    const newPosition = calculateInsertPosition(ITEMS, 0)   // -1
    await updatePositions(db, 'lists', [{ id: ITEMS[4].id, position: newPosition }])

    const movedItem = store.lists.find(l => l.id === ITEMS[4].id)!
    expect(movedItem.position).toBe(newPosition)

    // All other items are untouched
    for (const original of ITEMS.slice(0, 4)) {
      const stored = store.lists.find(l => l.id === original.id)!
      expect(stored.position).toBe(original.position)
    }
  })
})
