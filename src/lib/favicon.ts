/**
 * Build a Google favicon service URL for a given hostname or full URL.
 * Falls back to empty string if the URL is invalid.
 */
export function faviconUrl(urlOrHostname: string): string {
  try {
    const hostname = urlOrHostname.includes('://')
      ? new URL(urlOrHostname).hostname
      : urlOrHostname
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
  } catch {
    return ''
  }
}

/**
 * Extract the hostname from a URL string.
 * Returns empty string if invalid.
 */
export function extractHostname(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}
