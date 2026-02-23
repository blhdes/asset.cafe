import type { SupabaseClient } from '@supabase/supabase-js'
import type { Resource } from '@src/lib/types'
import { Temporal } from '@js-temporal/polyfill'

// ── Stored row shapes ─────────────────────────────────────────────────────────

export interface StoredList {
  id: string
  vault_hash: string
  name: string
  tags: string[]
  position: number
}

export interface StoredAsset {
  id: string
  list_id: string
  name: string
  ticker: string
  summary: string
  description: string
  tags: string[]
  resources: Resource[]
  image_url: string | null
  position: number
  created_at: string
}

export interface MockStore {
  lists: StoredList[]
  assets: StoredAsset[]
  _nextListId: number
  _nextAssetId: number
}

export function createStore(): MockStore {
  return { lists: [], assets: [], _nextListId: 0, _nextAssetId: 0 }
}

// ── In-memory query builder ───────────────────────────────────────────────────

type Filter = { field: string; value: unknown; op: 'eq' | 'in' }

class QueryBuilder {
  // Explicit field declarations are required — parameter properties are
  // disallowed by erasableSyntaxOnly (they generate constructor body code).
  private _table: string
  private _store: MockStore
  private _filters: Filter[] = []
  private _order: { field: string; ascending: boolean } | null = null
  private _limit: number | null = null
  private _isSingle = false
  private _isInsert = false
  private _isUpdate = false
  private _insertedRow: unknown = null
  private _updatePayload: Record<string, unknown> | null = null

  constructor(table: string, store: MockStore) {
    this._table = table
    this._store = store
  }

  select(_fields?: string): this { return this }

  eq(field: string, value: unknown): this {
    this._filters.push({ field, value, op: 'eq' })
    return this
  }

  in(field: string, value: unknown[]): this {
    this._filters.push({ field, value, op: 'in' })
    return this
  }

  order(field: string, opts?: { ascending?: boolean }): this {
    this._order = { field, ascending: opts?.ascending ?? true }
    return this
  }

  limit(n: number): this {
    this._limit = n
    return this
  }

  single(): this {
    this._isSingle = true
    return this
  }

  update(data: Record<string, unknown>): this {
    this._isUpdate = true
    this._updatePayload = data
    return this
  }

  insert(data: unknown): this {
    this._isInsert = true
    const rows = Array.isArray(data) ? data : [data]

    if (this._table === 'lists') {
      const row = rows[0] as Omit<StoredList, 'id'>
      const stored: StoredList = { id: `list-${++this._store._nextListId}`, ...row }
      this._store.lists.push(stored)
      this._insertedRow = stored
    } else {
      for (const row of rows) {
        const r = row as Omit<StoredAsset, 'id' | 'created_at'>
        this._store.assets.push({
          id: `asset-${++this._store._nextAssetId}`,
          created_at: Temporal.Now.instant().toString(),
          ...r,
        })
      }
    }

    return this
  }

  private _readRows(): unknown[] {
    const source: unknown[] =
      this._table === 'lists' ? this._store.lists : this._store.assets

    let rows = source.filter(row => {
      const r = row as Record<string, unknown>
      return this._filters.every(f =>
        f.op === 'eq'
          ? r[f.field] === f.value
          : (f.value as unknown[]).includes(r[f.field]),
      )
    })

    if (this._order) {
      const { field, ascending } = this._order
      rows = [...rows].sort((a, b) => {
        const av = (a as Record<string, unknown>)[field] as number
        const bv = (b as Record<string, unknown>)[field] as number
        return ascending ? av - bv : bv - av
      })
    }

    if (this._limit !== null) rows = rows.slice(0, this._limit)
    return rows
  }

  // PromiseLike — makes `await builder` resolve without an explicit .then() call.
  then<R>(
    onfulfilled: (v: { data: unknown; error: null }) => R,
    onrejected?: (e: unknown) => R,
  ): Promise<R> {
    let data: unknown
    if (this._isInsert) {
      data = this._isSingle ? this._insertedRow : null
    } else if (this._isUpdate && this._updatePayload) {
      // Mutate the matched rows in-place so the store reflects the change.
      for (const row of this._readRows()) {
        Object.assign(row as object, this._updatePayload)
      }
      data = null
    } else {
      const rows = this._readRows()
      data = this._isSingle ? (rows[0] ?? null) : rows
    }
    return Promise.resolve({ data, error: null as null }).then(onfulfilled, onrejected)
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function createMockSupabase(store: MockStore): SupabaseClient {
  return {
    from(table: string) {
      return new QueryBuilder(table, store)
    },
  } as unknown as SupabaseClient
}
