/**
 * Fetch a page title by racing multiple sources in parallel.
 * The first source that returns a valid title wins; the rest are aborted.
 *
 * Sources (all fire simultaneously):
 *  1. jsonlink.io  — metadata-extraction API, returns structured JSON
 *  2. allorigins.win — CORS proxy, returns raw HTML we parse ourselves
 *  3. Direct fetch  — works for the few CORS-permissive sites
 */

// ── helpers ────────────────────────────────────────────────

/** Decode HTML entities (&amp; &#39; etc.) using the browser's parser. */
function decodeEntities(text: string): string {
  const el = document.createElement('textarea')
  el.innerHTML = text
  return el.value
}

/** Extract the best available title from raw HTML. */
function extractTitle(html: string): string | null {
  const og = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
  )
  if (og?.[1]) return decodeEntities(og[1].trim())

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (title?.[1]) return decodeEntities(title[1].trim())

  return null
}

// ── individual strategies (each rejects on failure) ────────

async function tryJsonLink(url: string, signal: AbortSignal): Promise<string> {
  const endpoint = `https://jsonlink.io/api/extract?url=${encodeURIComponent(url)}`
  const res = await fetch(endpoint, { signal })
  if (!res.ok) throw new Error('jsonlink: bad status')
  const data = await res.json()
  const t = data.title?.trim()
  if (!t) throw new Error('jsonlink: no title')
  return t
}

async function tryAllOrigins(url: string, signal: AbortSignal): Promise<string> {
  const endpoint = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  const res = await fetch(endpoint, { signal })
  if (!res.ok) throw new Error('allorigins: bad status')
  const html = await res.text()
  const t = extractTitle(html)
  if (!t) throw new Error('allorigins: no title')
  return t
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
  if (!t) throw new Error('direct: no title')
  return t
}

// ── public API ─────────────────────────────────────────────

export async function fetchPageTitle(
  url: string,
  parentSignal?: AbortSignal,
): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  // Forward parent abort
  const onAbort = () => controller.abort()
  parentSignal?.addEventListener('abort', onAbort)

  const s = controller.signal

  try {
    const title = await Promise.any([
      tryJsonLink(url, s),
      tryAllOrigins(url, s),
      tryDirect(url, s),
    ])
    controller.abort()   // cancel the remaining in-flight requests
    return title
  } catch {
    return null           // all three failed
  } finally {
    clearTimeout(timeout)
    parentSignal?.removeEventListener('abort', onAbort)
  }
}
