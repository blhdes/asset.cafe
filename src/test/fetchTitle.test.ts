import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchPageTitle } from '@src/lib/fetchTitle'

const TEST_URL = 'https://example.com'

/** Build a minimal mock Response object. */
function res(body: string | object, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response
}

afterEach(() => vi.unstubAllGlobals())

// ── Happy Path ────────────────────────────────────────────────────────────────

describe('fetchPageTitle – happy path', () => {
  it('returns the title provided by jsonlink when it responds successfully', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('jsonlink.io')) return Promise.resolve(res({ title: 'My Page' }))
      return Promise.reject(new Error('skip'))
    }))

    expect(await fetchPageTitle(TEST_URL)).toBe('My Page')
  })

  it('returns the og:title extracted from a CORS proxy HTML response', async () => {
    const html = `<head><meta property="og:title" content="OG Title"></head>`
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('jsonlink.io')) return Promise.reject(new Error('skip'))
      return Promise.resolve(res(html))
    }))

    expect(await fetchPageTitle(TEST_URL)).toBe('OG Title')
  })

  it('returns the twitter:title when og:title is absent', async () => {
    const html = `<head><meta name="twitter:title" content="Twitter Title"></head>`
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('jsonlink.io')) return Promise.reject(new Error('skip'))
      return Promise.resolve(res(html))
    }))

    expect(await fetchPageTitle(TEST_URL)).toBe('Twitter Title')
  })

  it('falls back to the <title> tag when no meta title tags are present', async () => {
    const html = `<html><head><title>Plain Title</title></head></html>`
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('jsonlink.io')) return Promise.reject(new Error('skip'))
      return Promise.resolve(res(html))
    }))

    expect(await fetchPageTitle(TEST_URL)).toBe('Plain Title')
  })

  it('still resolves when a non-aborted parentSignal is supplied', async () => {
    const controller = new AbortController()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(res({ title: 'Hello' }))))

    expect(await fetchPageTitle(TEST_URL, controller.signal)).toBe('Hello')
  })
})

// ── Edge Cases ────────────────────────────────────────────────────────────────

describe('fetchPageTitle – edge cases', () => {
  it('decodes HTML entities in the <title> tag (&amp; → &)', async () => {
    const html = `<title>Tom &amp; Jerry</title>`
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('jsonlink.io')) return Promise.reject(new Error('skip'))
      return Promise.resolve(res(html))
    }))

    expect(await fetchPageTitle(TEST_URL)).toBe('Tom & Jerry')
  })

  it('collapses multi-line <title> content into a single trimmed string', async () => {
    const html = `<title>\n  My\n  Title\n</title>`
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('jsonlink.io')) return Promise.reject(new Error('skip'))
      return Promise.resolve(res(html))
    }))

    expect(await fetchPageTitle(TEST_URL)).toBe('My Title')
  })

  it('handles og:title with content attribute listed before property (reversed order)', async () => {
    const html = `<meta content="Reversed OG" property="og:title">`
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('jsonlink.io')) return Promise.reject(new Error('skip'))
      return Promise.resolve(res(html))
    }))

    expect(await fetchPageTitle(TEST_URL)).toBe('Reversed OG')
  })

  it('trims surrounding whitespace from the jsonlink title field', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('jsonlink.io')) return Promise.resolve(res({ title: '  Padded  ' }))
      return Promise.reject(new Error('skip'))
    }))

    expect(await fetchPageTitle(TEST_URL)).toBe('Padded')
  })

  it('returns null when the HTML has no recognisable title content', async () => {
    const html = `<html><body><p>No title anywhere</p></body></html>`
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(res(html))))

    expect(await fetchPageTitle(TEST_URL)).toBeNull()
  })
})

// ── Error States ──────────────────────────────────────────────────────────────

describe('fetchPageTitle – error states', () => {
  it('returns null when all strategies fail with a network error', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network error'))))

    expect(await fetchPageTitle(TEST_URL)).toBeNull()
  })

  it('returns null when every strategy returns a non-ok HTTP status', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(res('', false))))

    expect(await fetchPageTitle(TEST_URL)).toBeNull()
  })

  it('returns null when jsonlink responds with an empty title string', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url.includes('jsonlink.io')) return Promise.resolve(res({ title: '' }))
      return Promise.reject(new Error('skip'))
    }))

    expect(await fetchPageTitle(TEST_URL)).toBeNull()
  })

  it('returns null when the parent AbortSignal triggers and all fetches are rejected', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.reject(new DOMException('The operation was aborted.', 'AbortError'))
    ))

    const controller = new AbortController()
    controller.abort()

    expect(await fetchPageTitle(TEST_URL, controller.signal)).toBeNull()
  })
})
