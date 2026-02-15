# asset.cafe

**A secure, seed-based asset vault for organizing and tracking financial assets with privacy at its core.**

---

## Overview

asset.cafe is a privacy-first web application for managing curated lists of financial assets (stocks, crypto, real estate, etc.). All data is encrypted and isolated per user using a **seed phrase-based vault system** — no accounts, no emails, just a 12-word phrase that unlocks your personal database.

### Key Features

- **Seed-phrase authentication**: Generate a 12-word BIP39 seed phrase. Your vault is deterministically derived from its hash.
- **Zero backend storage of credentials**: The seed phrase is hashed client-side and never transmitted. Your vault hash is your database ID.
- **Supabase multi-tenancy**: Each vault is an isolated partition in a shared Supabase database.
- **Asset management**: Organize assets into lists, add logos, descriptions (markdown), tags, and resource links.
- **Custom asset images**: Upload logos via URL to replace the default gradient ticker badge.
- **Full markdown editor**: Built-in toolbar for formatting descriptions (bold, italic, headings, lists, code, links).
- **Responsive UI**: Mobile-first design with bottom-sheet modals, swipe-to-dismiss, and desktop hover interactions.
- **Premium design system**: Dark slate + amber/gold palette, Instrument Serif + General Sans + JetBrains Mono typography, sharp editorial radii.

---

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4 + custom CSS design tokens
- **Database**: Supabase (PostgreSQL)
- **Routing**: React Router 7
- **Auth**: Client-side seed phrase → PBKDF2 hash → vault partition
- **Markdown**: marked.js for rendering
- **Icons**: Heroicons (inline SVG)

---

## How It Works

### 1. Seed Phrase Generation & Hashing

On the landing page, users can:
- Generate a new 12-word BIP39 seed phrase (using `bip39` library)
- Or paste an existing seed phrase

The seed phrase is hashed client-side using **PBKDF2** (100,000 iterations, SHA-256) to produce a 256-bit vault hash. This hash becomes the `vault_hash` partition key in the database.

**No seed phrase is ever sent to the server.** Only the hash is used for database queries.

### 2. Vault Isolation

Each vault is isolated via Row-Level Security (RLS) policies in Supabase. All queries filter by `vault_hash`:

```sql
-- Example RLS policy
CREATE POLICY "Users can only see their own lists"
ON lists FOR SELECT
USING (vault_hash = current_setting('request.jwt.claims')::json->>'vault_hash');
```

The vault hash is stored in `sessionStorage` for the session duration. Clicking "Lock" clears it and returns to the landing page.

### 3. Data Model

**Lists** (`vault_lists` table)
- `id` (UUID)
- `vault_hash` (text) — partition key
- `name` (text)
- `tags` (text[])
- `created_at`, `updated_at`

**Assets** (`assets` table)
- `id` (UUID)
- `list_id` (UUID) — foreign key to `vault_lists`
- `name` (text)
- `ticker` (text)
- `summary` (text, max 250 chars)
- `description` (text, markdown)
- `tags` (text[])
- `resources` (jsonb) — array of `{title, url, favicon}`
- `image_url` (text, nullable) — custom logo URL
- `created_at`

### 4. UI/UX Flow

1. **Landing Page**: Generate or enter seed phrase → hash → navigate to `/vault/{hash}`
2. **Vault Page**: View/create lists → click list → view/add assets
3. **Asset Cards**:
   - Collapsed: ticker badge (gradient or custom image), name, tags (desktop), resource count
   - Expanded: summary, description editor, resources, tags CRUD, delete
   - Hover ticker badge (when expanded) → camera icon overlay → click → add/edit custom logo
4. **Modals**: All modals use React portals (`createPortal(jsx, document.body)`) to avoid CSS stacking context issues. Mobile: bottom-sheet with swipe-to-dismiss. Desktop: centered with scale+fade animation.

---

## Design System

### Typography
- **Display**: Instrument Serif (Google Fonts)
- **Body**: General Sans (Fontshare)
- **Mono**: JetBrains Mono (Google Fonts)

### Color Palette (Dark Slate + Amber/Gold)
- **Surfaces**: `#08090d`, `#0e1018`, `#161922`, `#1e2028`
- **Accent**: `#d4952a` (amber/gold)
- **Borders**: `#1a1d26`, `#2a2d38`, `#3a3d48`
- **Text**: `#e8e8e8`, `#b8b8b8`, `#888`, `#555`

### Border Radii
- `--radius-sm`: 2px
- `--radius-md`: 6px
- `--radius-lg`: 8px
- `--radius-pill`: 999px

### Key CSS Classes
- `.card-surface`: Hover lift + shadow + border lighten
- `.ticker-badge`: 36×36px square gradient badge (or custom image)
- `.btn-primary` / `.btn-ghost`: Button variants
- `.input-field`: Unified input styling
- `.tag-pill`: Pill badge with inset shadow when active
- `.animate-modal-sheet`: Bottom-sheet slide-up (mobile)
- `.animate-modal-backdrop`: Fade-in overlay
- `.grid-expand-wrapper`: CSS grid 0fr↔1fr smooth expand/collapse

---

## Project Structure

```
asset-cafe/
├── public/
│   ├── favicon.svg              # C7 "Mid Handle" logo
│   ├── favicon.ico              # Legacy favicon
│   ├── favicon-16x16.png
│   ├── favicon-32x32.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-*.png
│   └── site.webmanifest
├── scripts/
│   └── generate-favicons.mjs    # Sharp-based favicon generation
├── src/
│   ├── components/
│   │   ├── Logo.tsx             # C7 favicon as React component
│   │   ├── MarkdownEditor.tsx   # Custom markdown toolbar + textarea
│   │   ├── Modal.tsx            # Shared modal (portal + swipe)
│   │   ├── Skeleton.tsx         # Loading skeletons
│   │   └── Toast.tsx            # Toast notifications
│   ├── features/
│   │   ├── assets/
│   │   │   ├── AddAssetModal.tsx
│   │   │   ├── AddResourceModal.tsx
│   │   │   ├── AssetCard.tsx    # Main asset card (expand/collapse, image modal)
│   │   │   ├── AssetListView.tsx
│   │   │   └── DescriptionModal.tsx
│   │   ├── auth/
│   │   │   └── seedPhrase.ts    # BIP39 + PBKDF2 hashing
│   │   └── lists/
│   │       └── ListsView.tsx
│   ├── lib/
│   │   ├── favicon.ts           # Google favicon proxy
│   │   ├── supabase.ts          # Supabase client factory
│   │   └── types.ts             # TypeScript types
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   └── VaultPage.tsx
│   ├── index.css                # Full design system + animations
│   └── main.tsx
├── supabase-migration-image-url.sql  # DB migration for image_url column
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- Supabase account

### 1. Clone & Install
```bash
git clone <repository-url>
cd asset-cafe
npm install
```

### 2. Supabase Setup

Create a Supabase project, then run the following SQL in the **SQL Editor**:

```sql
-- Create vault_lists table
CREATE TABLE vault_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vault_lists_hash ON vault_lists(vault_hash);

-- Create assets table
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES vault_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ticker TEXT NOT NULL,
  summary TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  resources JSONB DEFAULT '[]',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_assets_list ON assets(list_id);

-- Enable RLS
ALTER TABLE vault_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies (example - adjust for your auth setup)
CREATE POLICY "vault_lists_select" ON vault_lists FOR SELECT USING (true);
CREATE POLICY "vault_lists_insert" ON vault_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "vault_lists_update" ON vault_lists FOR UPDATE USING (true);
CREATE POLICY "vault_lists_delete" ON vault_lists FOR DELETE USING (true);

CREATE POLICY "assets_select" ON assets FOR SELECT USING (true);
CREATE POLICY "assets_insert" ON assets FOR INSERT WITH CHECK (true);
CREATE POLICY "assets_update" ON assets FOR UPDATE USING (true);
CREATE POLICY "assets_delete" ON assets FOR DELETE USING (true);
```

Run the migration for `image_url`:
```bash
# In Supabase SQL Editor, paste contents of:
cat supabase-migration-image-url.sql
```

### 3. Environment Variables

Create `.env` in project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:5173`

### 5. Build for Production
```bash
npm run build
npm run preview  # Preview production build
```

---

## Usage Guide

### Creating Your Vault

1. **Generate Seed Phrase**: Click "Generate New Seed Phrase" on the landing page
2. **Save It Securely**: Write down your 12 words. This is your only way to access the vault.
3. **Copy to Clipboard** (optional)
4. **Access Vault**: Click "Access Vault" → app hashes the phrase and navigates to your vault

### Managing Lists

- Click **"+ Create List"** to add a new list
- Name it (e.g., "Tech Stocks", "Real Estate")
- Optionally add tags for organization
- Click a list card to view its assets

### Managing Assets

- Inside a list, click **"+ Add Asset"**
- Fill in: Name, Ticker, Summary (optional, max 250 chars)
- Click **Save**
- The asset appears as a collapsed card

### Expanding Assets

Click any asset card to expand it. You'll see:
- **Summary** (if set)
- **Description**: Click "View / Edit" to open the markdown editor
- **Resources**: URLs to external links (investor decks, articles, etc.)
- **Tags**: Add/remove tags for filtering
- **Custom Image**: Hover over the ticker badge → camera icon → click → paste logo URL

### Custom Asset Images

1. Expand an asset
2. Hover over the ticker badge (gradient square)
3. A camera icon overlay appears
4. Click the badge
5. Paste a direct image URL (PNG, JPG, SVG)
6. Preview loads
7. Click **Save** → image replaces the gradient
8. Click **Remove** to revert to gradient

### Markdown Editor

The description modal includes a toolbar:
- **Bold** (Ctrl+B), **Italic** (Ctrl+I), **Strikethrough**
- **Headings** (H2), **Blockquote**
- **Bullet list**, **Ordered list**
- **Code** (inline or block)
- **Link** (Ctrl+K)

Type directly or select text and click a format button.

### Locking Your Vault

Click the **Lock** button (top-right) to:
- Clear the vault hash from `sessionStorage`
- Return to the landing page
- Require re-entering the seed phrase to access the vault again

---

## Security Considerations

- **Seed phrase is everything**: Losing your seed phrase = permanent loss of vault access.
- **No password recovery**: There is no "forgot password" — the seed phrase IS the password.
- **Client-side hashing**: PBKDF2 is computed in the browser. The hash is deterministic (same phrase = same hash).
- **Row-Level Security (RLS)**: Supabase policies must be properly configured to isolate vaults. The example policies above allow all operations for simplicity — **in production, tie RLS to JWT claims or vault_hash validation**.
- **HTTPS required**: Always serve over HTTPS in production to protect seed phrases in transit.

---

## Roadmap / Future Enhancements

- **Import/Export**: JSON export of vault data
- **Encrypted notes**: End-to-end encrypted notes per asset (using seed phrase as key)
- **Multi-vault support**: Manage multiple vaults from one session
- **Price tracking**: Integrate live price APIs for stocks/crypto
- **Search & filters**: Global search across all assets, tag filtering
- **Dark/Light mode toggle**: User preference for theme
- **Collaborative vaults**: Share vault access via shared seed phrase

---

## Contributing

This is a personal project. If you'd like to fork and extend it, feel free! Pull requests are welcome for bug fixes and feature additions.

---

## License

MIT License. See `LICENSE` file for details.

---

## Credits

- **Design & Development**: Built with care for privacy and premium UX
- **Fonts**: Instrument Serif (Google Fonts), General Sans (Fontshare), JetBrains Mono
- **Icons**: Heroicons
- **Logo**: Custom "C7 - Mid Handle" design (coffee cup made of ascending bars)

---

**asset.cafe** — Your assets, your vault, your privacy.
