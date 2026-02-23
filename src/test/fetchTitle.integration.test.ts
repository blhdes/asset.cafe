/**
 * Live integration test for fetchPageTitle.
 *
 * Fires real HTTP requests through all four strategies (jsonlink, allorigins,
 * corsproxy, direct).  All URLs run in parallel so the suite finishes in
 * roughly the time of the slowest response, not 55 × 8 s.
 *
 * Pass threshold: ≥ 90 % of URLs must return a non-null title.
 * Failures are printed as a table so they can be diagnosed and fixed.
 *
 * Run in isolation:
 *   npx vitest run src/test/fetchTitle.integration.test.ts
 */

import { describe, it, expect } from 'vitest'
import { fetchPageTitle } from '@src/lib/fetchTitle'

// ── URL corpus ────────────────────────────────────────────────────────────────

const URLS: { url: string; category: string }[] = [
  // Press / News ────────────────────────────────────────────────────────────
  { url: 'https://www.newyorker.com',        category: 'press'    },
  { url: 'https://elpais.com',               category: 'press'    },
  { url: 'https://www.nytimes.com',          category: 'press'    },
  { url: 'https://www.theguardian.com',      category: 'press'    },
  { url: 'https://www.bbc.com',              category: 'press'    },
  { url: 'https://www.reuters.com',          category: 'press'    },
  { url: 'https://www.bloomberg.com',        category: 'press'    },
  { url: 'https://www.ft.com',               category: 'press'    },
  { url: 'https://www.economist.com',        category: 'press'    },
  { url: 'https://techcrunch.com',           category: 'press'    },
  { url: 'https://www.wired.com',            category: 'press'    },
  { url: 'https://arstechnica.com',          category: 'press'    },
  { url: 'https://www.theatlantic.com',      category: 'press'    },
  { url: 'https://www.theverge.com',         category: 'press'    },
  { url: 'https://www.politico.com',         category: 'press'    },
  { url: 'https://www.axios.com',            category: 'press'    },
  { url: 'https://apnews.com',               category: 'press'    },
  { url: 'https://www.lemonde.fr',           category: 'press'    },
  { url: 'https://www.spiegel.de',           category: 'press'    },
  { url: 'https://www.corriere.it',          category: 'press'    },

  // Finance / Trading ───────────────────────────────────────────────────────
  { url: 'https://www.tradingview.com',      category: 'finance'  },
  { url: 'https://www.coinbase.com',         category: 'finance'  },
  { url: 'https://www.binance.com',          category: 'finance'  },
  { url: 'https://www.investopedia.com',     category: 'finance'  },
  { url: 'https://finance.yahoo.com',        category: 'finance'  },
  { url: 'https://www.nasdaq.com',           category: 'finance'  },
  { url: 'https://www.morningstar.com',      category: 'finance'  },
  { url: 'https://www.marketwatch.com',      category: 'finance'  },
  { url: 'https://www.wsj.com',              category: 'finance'  },
  { url: 'https://www.cnbc.com',             category: 'finance'  },

  // Official / Tech / SaaS ──────────────────────────────────────────────────
  { url: 'https://www.apple.com',            category: 'official' },
  { url: 'https://www.microsoft.com',        category: 'official' },
  { url: 'https://www.amazon.com',           category: 'official' },
  { url: 'https://www.netflix.com',          category: 'official' },
  { url: 'https://www.spotify.com',          category: 'official' },
  { url: 'https://github.com',               category: 'official' },
  { url: 'https://www.wikipedia.org',        category: 'official' },
  { url: 'https://www.tesla.com',            category: 'official' },
  { url: 'https://www.openai.com',           category: 'official' },
  { url: 'https://www.anthropic.com',        category: 'official' },
  { url: 'https://www.stripe.com',           category: 'official' },
  { url: 'https://www.shopify.com',          category: 'official' },
  { url: 'https://www.notion.so',            category: 'official' },
  { url: 'https://www.figma.com',            category: 'official' },
  { url: 'https://www.vercel.com',           category: 'official' },
  { url: 'https://stackoverflow.com',        category: 'official' },
  { url: 'https://news.ycombinator.com',     category: 'official' },
  { url: 'https://substack.com',             category: 'official' },
  { url: 'https://www.producthunt.com',      category: 'official' },
  { url: 'https://www.behance.net',          category: 'official' },

  // Social Media ────────────────────────────────────────────────────────────
  { url: 'https://twitter.com',              category: 'social'   },
  { url: 'https://www.instagram.com',        category: 'social'   },
  { url: 'https://www.reddit.com',           category: 'social'   },
  { url: 'https://www.linkedin.com',         category: 'social'   },
  { url: 'https://www.youtube.com',          category: 'social'   },
  { url: 'https://www.tiktok.com',           category: 'social'   },
  { url: 'https://www.facebook.com',         category: 'social'   },
  { url: 'https://www.pinterest.com',        category: 'social'   },
  { url: 'https://www.medium.com',           category: 'social'   },
  { url: 'https://www.tumblr.com',           category: 'social'   },
]

// ── Test ──────────────────────────────────────────────────────────────────────

describe('fetchPageTitle – live integration (real network)', () => {
  it(
    'resolves a title for ≥ 90 % of a 60-URL corpus spanning press, finance, official, and social sites',
    async () => {
      // Fire all requests concurrently — total time ≈ slowest URL (≤ 8 s each)
      const results = await Promise.all(
        URLS.map(async ({ url, category }) => ({
          url,
          category,
          title: await fetchPageTitle(url),
        })),
      )

      const passed  = results.filter(r => r.title !== null)
      const failed  = results.filter(r => r.title === null)
      const rate    = passed.length / results.length

      // ── Report ──────────────────────────────────────────────────────────
      console.log(`\n── fetchPageTitle integration results ──────────────────`)
      console.log(`Total: ${results.length}  ✓ ${passed.length}  ✗ ${failed.length}  (${(rate * 100).toFixed(1)} %)`)

      if (passed.length) {
        console.log('\n✓ Successes:')
        console.table(
          passed.map(r => ({ category: r.category, url: r.url, title: r.title })),
        )
      }

      if (failed.length) {
        console.log('\n✗ Failures (null title — all four strategies rejected):')
        console.table(
          failed.map(r => ({ category: r.category, url: r.url })),
        )
      }

      // Group failure rate by category so we can spot systemic problems
      const categories = [...new Set(URLS.map(u => u.category))]
      console.log('\nFailure rate by category:')
      for (const cat of categories) {
        const total   = results.filter(r => r.category === cat).length
        const catFail = failed.filter(r => r.category === cat).length
        console.log(`  ${cat.padEnd(10)} ${catFail}/${total} failed`)
      }

      // ── Assertion ───────────────────────────────────────────────────────
      expect(
        rate,
        `Success rate ${(rate * 100).toFixed(1)} % is below the 90 % threshold.\nFailed URLs:\n${failed.map(r => `  ${r.url}`).join('\n')}`,
      ).toBeGreaterThanOrEqual(0.9)
    },
    // 25 s ceiling — all 60 requests run in parallel; each has an 8 s internal abort
    25_000,
  )
})
