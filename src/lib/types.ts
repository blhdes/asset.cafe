/** A user-attached link (e.g. article, filing) stored inside an Asset's resources array. */
export interface Resource {
  title: string
  url: string
  favicon: string
}

/** A named watchlist owned by a vault. Assets are grouped inside lists. */
export interface VaultList {
  id: string
  vault_hash: string
  name: string
  tags: string[]
  position: number
  created_at: string
  updated_at: string
}

/** A single tracked asset (stock, crypto, etc.) belonging to a VaultList. */
export interface Asset {
  id: string
  list_id: string
  name: string
  ticker: string
  /** Max 250 characters */
  summary: string
  /** Markdown string */
  description: string
  tags: string[]
  resources: Resource[]
  /** URL to a custom logo/image for the asset */
  image_url?: string
  position: number
  created_at: string
}
