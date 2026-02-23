/**
 * Fetch a page title by racing multiple strategies in parallel.
 * First source that returns a valid title wins; the rest are aborted.
 *
 * Strategies (all fire simultaneously):
 *  1. microlink.io  — headless-browser metadata API (handles JS-rendered pages)
 *  2. jsonlink.io   — metadata extraction API (structured JSON)
 *  3. allorigins.win — CORS proxy (raw HTML)
 *  4. corsproxy.io   — CORS proxy (raw HTML)
 *  5. codetabs.com  — CORS proxy (raw HTML)
 *  6. Direct fetch   — works for CORS-permissive sites
 *
 * The HTML parser handles real-world markup:
 *  - og:title, twitter:title, name="title" meta tags
 *  - Attributes in any order (content before/after property)
 *  - Multi-line <title> tags
 *  - Single and double quotes, unquoted attributes
 */

// ── helpers ────────────────────────────────────────────────

/** Decode HTML entities (&amp; &#39; &#x27; etc.) using the browser. */
function decodeEntities(text: string): string {
  const el = document.createElement('textarea')
  el.innerHTML = text
  return el.value
}

/**
 * Extract a meta tag's content by property or name.
 * Handles attributes in any order and various quoting styles.
 */
function extractMeta(html: string, attr: 'property' | 'name', value: string): string | null {
  // Build a pattern that matches the meta tag with attributes in either order:
  //   <meta property="og:title" content="...">
  //   <meta content="..." property="og:title">
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  // Pattern 1: attr before content
  const p1 = new RegExp(
    `<meta\\s+[^>]*?${attr}\\s*=\\s*["']${escaped}["'][^>]*?content\\s*=\\s*["']([^"']+)["']`,
    'i',
  )
  const m1 = html.match(p1)
  if (m1?.[1]) return decodeEntities(m1[1].trim())

  // Pattern 2: content before attr
  const p2 = new RegExp(
    `<meta\\s+[^>]*?content\\s*=\\s*["']([^"']+)["'][^>]*?${attr}\\s*=\\s*["']${escaped}["']`,
    'i',
  )
  const m2 = html.match(p2)
  if (m2?.[1]) return decodeEntities(m2[1].trim())

  return null
}

/** Extract the best available title from raw HTML. */
function extractTitle(html: string): string | null {
  // 1. Open Graph title (most reliable for social/link previews)
  const og = extractMeta(html, 'property', 'og:title')
  if (og) return og

  // 2. Twitter card title
  const twitter = extractMeta(html, 'name', 'twitter:title')
  if (twitter) return twitter

  // 3. Generic meta name="title"
  const metaTitle = extractMeta(html, 'name', 'title')
  if (metaTitle) return metaTitle

  // 4. <title> tag — handle multi-line content and whitespace
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch?.[1]) {
    const cleaned = decodeEntities(titleMatch[1].replace(/\s+/g, ' ').trim())
    if (cleaned) return cleaned
  }

  return null
}

/** Clean up a title — remove common junk suffixes, excessive whitespace. */
function cleanTitle(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .trim()
}

// ── individual strategies (each rejects on failure) ────────

// microlink.io renders pages with a headless browser, making it the most
// capable strategy for JS-heavy SPAs and social media sites.
async function tryMicrolink(url: string, signal: AbortSignal): Promise<string> {
  const endpoint = `https://api.microlink.io?url=${encodeURIComponent(url)}`
  const res = await fetch(endpoint, { signal })
  if (!res.ok) throw new Error('microlink: bad status')
  const data = await res.json()
  if (data.status !== 'success') throw new Error('microlink: non-success status')
  const t = (data.data?.title as string)?.trim()
  if (!t) throw new Error('microlink: no title')
  return cleanTitle(t)
}

async function tryJsonLink(url: string, signal: AbortSignal): Promise<string> {
  const endpoint = `https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`
  const res = await fetch(endpoint, { signal })
  if (!res.ok) throw new Error('jsonlink: bad status')
  const data = await res.json()
  const t = (data.title as string)?.trim()
  if (!t) throw new Error('jsonlink: no title')
  return cleanTitle(t)
}

async function tryAllOrigins(url: string, signal: AbortSignal): Promise<string> {
  const endpoint = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  const res = await fetch(endpoint, { signal })
  if (!res.ok) throw new Error('allorigins: bad status')
  const html = await res.text()
  const t = extractTitle(html)
  if (!t) throw new Error('allorigins: no title in HTML')
  return cleanTitle(t)
}

async function tryCorsProxy(url: string, signal: AbortSignal): Promise<string> {
  const endpoint = `https://corsproxy.io/?${encodeURIComponent(url)}`
  const res = await fetch(endpoint, { signal })
  if (!res.ok) throw new Error('corsproxy: bad status')
  const html = await res.text()
  const t = extractTitle(html)
  if (!t) throw new Error('corsproxy: no title in HTML')
  return cleanTitle(t)
}

async function tryCodeTabs(url: string, signal: AbortSignal): Promise<string> {
  const endpoint = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  const res = await fetch(endpoint, { signal })
  if (!res.ok) throw new Error('codetabs: bad status')
  const html = await res.text()
  const t = extractTitle(html)
  if (!t) throw new Error('codetabs: no title in HTML')
  return cleanTitle(t)
}

async function tryDirect(url: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(url, {
    signal,
    mode: 'cors',
    headers: { Accept: 'text/html' },
  })
  if (!res.ok) throw new Error('direct: bad status')
  const html = await res.text()
  const t = extractTitle(html)
  if (!t) throw new Error('direct: no title in HTML')
  return cleanTitle(t)
}

// ── public API ─────────────────────────────────────────────

export async function fetchPageTitle(
  url: string,
  parentSignal?: AbortSignal,
): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)

  const onAbort = () => controller.abort()
  parentSignal?.addEventListener('abort', onAbort)

  const s = controller.signal

  try {
    const title = await Promise.any([
      tryMicrolink(url, s),
      tryJsonLink(url, s),
      tryAllOrigins(url, s),
      tryCorsProxy(url, s),
      tryCodeTabs(url, s),
      tryDirect(url, s),
    ])
    controller.abort() // cancel remaining in-flight requests
    return title
  } catch {
    return null // all strategies failed
  } finally {
    clearTimeout(timeout)
    parentSignal?.removeEventListener('abort', onAbort)
  }
}
