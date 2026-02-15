export interface Resource {
  title: string
  url: string
  favicon: string
}

export interface VaultList {
  id: string
  vault_hash: string
  name: string
  tags: string[]
  created_at: string
  updated_at: string
}

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
  created_at: string
}
