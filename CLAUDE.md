# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # TypeScript compile + Vite production build
npm run lint      # ESLint validation (no test suite exists)
npm run preview   # Preview production build locally
```

There are no tests. `npm run build` is the primary validation step — it runs `tsc -b` first, so TypeScript errors will surface there.

## Environment

Requires a `.env` file (see `.env.example`):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Setup & Hooks
* **Initialization:** To initialize Claude's local settings and security hooks for a new environment, run `npm run init-claude`.

## Architecture

**warket** is a privacy-first asset watchlist app. Core concept: a 12-word BIP39 seed phrase is SHA-256 hashed client-side to produce a `vault_hash`, which is the sole identity token. No accounts, no emails — just the hash.

### Auth & Security Flow

1. User enters/generates a seed phrase → `src/features/auth/seedPhrase.ts` hashes it via Web Crypto API
2. Hash becomes the URL segment: `/vault/:hash`
3. All Supabase queries include an `x-vault-hash` header (set in `src/lib/supabase.ts`)
4. Supabase RLS policies filter every row by `vault_hash` — multi-tenancy without accounts
5. Read-only share keys are derived from vault hash (one-way) and stored in `vault_shares` table

### Routing & Pages

```
App.tsx
├── /                      → LandingPage.tsx (seed phrase entry/generation)
├── /vault/:hash           → VaultPage.tsx (main app)
└── /shared/:shareHash     → SharedVaultPage.tsx (read-only view)
```

### Feature Modules

Code is organized by feature under `src/features/`:
- `auth/` — seed phrase generation (BIP39 wordlist), SHA-256 hashing, share key derivation
- `assets/` — asset cards, list view, add/edit modals
- `lists/` — lists grid, CRUD, search/filter

### Key Libraries

| File | Role |
|------|------|
| `src/lib/supabase.ts` | Creates vault-scoped Supabase client with `x-vault-hash` header |
| `src/lib/types.ts` | Shared TypeScript interfaces (`Resource`, `VaultList`, `Asset`) |
| `src/lib/queries.ts` | Shared Supabase query functions (`resolveShareKey`, `fetchAssetsForList`, `fetchListsByVault`) |
| `src/lib/vaultExport.ts` | JSON export/import with selective list support |
| `src/lib/fetchTitle.ts` | URL title fetching (races multiple CORS proxies) |
| `src/lib/position.ts` | Batch position update for drag-and-drop reordering |

### State Management

No external state library. Uses React Context only for theme (`src/contexts/ThemeContext.tsx`). Everything else is local component state with direct Supabase calls.

### Styling

- **Tailwind CSS v4** with custom design tokens
- Theme switching via `data-theme="dark"|"light"` on `<html>` element
- All color/typography/spacing tokens defined as CSS custom properties in `src/index.css`
- Dark theme is default; flash prevention script in `index.html` applies theme before CSS loads
- Custom font stack: Instrument Serif (display), General Sans (body), JetBrains Mono (mono)
- Accent color: deep teal (`#2a9d8f` dark / `#1a8377` light)

### Database

Supabase PostgreSQL with RLS. Schema defined in `supabase/schema.sql`:
- Tables: `lists`, `assets`, `vault_shares`
- All tables have a `vault_hash` column filtered by RLS using the request header
- Drag-and-drop order persisted via `position` column (batch updated via `src/lib/position.ts`)

## Security & Environment

- **Seed phrases never leave the client.** All operations in `src/features/auth/seedPhrase.ts` — generation, hashing, share key derivation — are local. Never suggest or implement code that transmits a seed phrase over the network.
- Only the resulting `vault_hash` is sent to Supabase, never the phrase itself.
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` live in `.env` and must never be hardcoded in source files or committed to the repository.

## Coding Style

- Only comment complex or non-obvious logic — skip comments for standard React/Vite patterns, JSX structure, and self-evident operations
- Avoid verbose comments that restate what the code already clearly expresses

## Always Reference

Before implementing any new feature, read `src/lib/types.ts` and verify that your implementation is compatible with the existing `Resource`, `VaultList`, and `Asset` interfaces. Do not introduce new data shapes that duplicate or conflict with these types.

## Core References

Read these first when refactoring any data logic:

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | Central TypeScript interfaces — `Resource`, `VaultList`, `Asset` |
| `src/lib/queries.ts` | Shared query functions — use these before writing inline Supabase queries |
| `supabase/schema.sql` | Full database schema — tables, columns, RLS policies, helper functions |

### Drag & Drop

Uses `@dnd-kit` (core + sortable + utilities). Position updates are batched to Supabase after drop events complete.

### Components

Reusable components in `src/components/`:
- `Modal.tsx` — portalized, swipe-to-dismiss on mobile
- `MarkdownEditor.tsx` — toolbar + preview toggle
- `MarketPulse.tsx` — animated canvas background on landing page
- `Toast.tsx` — notification system
- `Skeleton.tsx` — loading states
