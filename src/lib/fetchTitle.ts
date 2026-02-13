/**
 * Fetch a page title by trying a direct request first (works for
 * CORS-permissive sites), then falling back to a CORS proxy.
 * Each attempt has a hard timeout so the spinner never hangs.
 */

function extractTitle(html: string): string | null {
  // Prefer og:title
  const og = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
  )
  if (og?.[1]) return og[1].trim()

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return title?.[1]?.trim() ?? null
}

/** Fetch URL with its own timeout + parent abort forwarding. */
async function tryFetch(
  fetchUrl: string,
  parentSignal?: AbortSignal,
  timeoutMs = 4000,
  init?: RequestInit,
): Promise<string | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const onAbort = () => controller.abort()
  parentSignal?.addEventListener('abort', onAbort)

  try {
    const res = await fetch(fetchUrl, { ...init, signal: controller.signal })
    if (!res.ok) return null
    const text = await res.text()
    return extractTitle(text)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
    parentSignal?.removeEventListener('abort', onAbort)
  }
}

export async function fetchPageTitle(
  url: string,
  signal?: AbortSignal,
): Promise<string | null> {
  // 1. Direct fetch — works for CORS-permissive sites, fast CORS rejection otherwise
  const direct = await tryFetch(url, signal, 4000, {
    mode: 'cors',
    headers: { Accept: 'text/html' },
  })
  if (direct) return direct

  // 2. CORS proxy fallback (allorigins raw endpoint)
  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  return tryFetch(proxy, signal, 5000)
}
