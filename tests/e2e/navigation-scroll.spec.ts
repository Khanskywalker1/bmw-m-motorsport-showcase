import { test, expect, type Page } from '@playwright/test'

/**
 * Landing at the top of the next page is not currently enforced by any code we
 * own — it falls out of Next's own scroll-to-top, and Lenis resyncing its
 * internal position from the external scroll rather than fighting it.
 *
 * That combination was verified by hand and works, but nothing asserted it, so
 * a change to SmoothScroll (or a Lenis upgrade that stops resyncing) could
 * silently regress it and nobody would notice until a reader landed three
 * screens down a page they had never seen the top of. Hence these tests.
 *
 * TWO HARNESS TRAPS, both hit while writing this:
 *
 *  - Scroll with `mouse.wheel`, never `window.scrollTo`. Lenis intercepts wheel
 *    events and tracks its own position from them; a programmatic scrollTo
 *    bypasses Lenis entirely, so the test would pass while exercising nothing.
 *  - Use `dispatchEvent('click')`, not `click()`. Lenis animates continuously,
 *    so Playwright's actionability check never sees the element as "stable" and
 *    click() hangs until it times out.
 */

const SETTLE = 1500

async function wheelToBottom(page: Page, ticks = 25) {
  try {
    await page.mouse.move(700, 450)
    for (let i = 0; i < ticks; i++) await page.mouse.wheel(0, 500)
  } catch {
    // Mobile WebKit has no wheel support at all ("Mouse wheel is not supported
    // in mobile WebKit"). Fall back to a programmatic scroll: weaker, because
    // it bypasses Lenis rather than driving it, but it still exercises the
    // thing under test — that navigating away resets the scroll position.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  }
  await page.waitForTimeout(SETTLE)
  return page.evaluate(() => Math.round(window.scrollY))
}

test.describe('scroll position across navigation', () => {
  test('car -> next car lands at the top', async ({ page }) => {
    await page.goto('/cars/m4-gt3-evo/')
    await page.waitForTimeout(SETTLE)

    const scrolled = await wheelToBottom(page)
    // Guard the guard: if the page never scrolled, landing at 0 proves nothing.
    expect(scrolled, 'page should have scrolled before we test the reset').toBeGreaterThan(1000)

    const link = page.locator('nav a[href^="/cars/"]').last()
    const href = await link.getAttribute('href')
    await link.dispatchEvent('click')
    await page.waitForURL(`**${href}`)
    await page.waitForTimeout(SETTLE)

    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(0)
  })

  test('home -> car lands at the top', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(SETTLE)

    const scrolled = await wheelToBottom(page, 30)
    expect(scrolled, 'page should have scrolled before we test the reset').toBeGreaterThan(1000)

    const link = page.locator('a[href^="/cars/"]').first()
    const href = await link.getAttribute('href')
    await link.dispatchEvent('click')
    await page.waitForURL(`**${href}`)
    await page.waitForTimeout(SETTLE)

    expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(0)
  })

  /**
   * The regression a naive "scroll to top on every route change" fix would
   * cause: the header's /#roster and /#series links are cross-page navigations,
   * so blanket-resetting would dump the reader at the top of the home page
   * instead of the section they asked for.
   */
  test('header anchor link lands on its section, not the top', async ({ page }) => {
    await page.goto('/cars/m4-gt3-evo/')
    await page.waitForTimeout(SETTLE)

    await page.locator('a[href="/#roster"]').first().dispatchEvent('click')
    await page.waitForURL('**/#roster')
    await page.waitForTimeout(SETTLE + 1000)

    const { scrollY, rosterTop } = await page.evaluate(() => {
      const el = document.getElementById('roster')
      return {
        scrollY: Math.round(window.scrollY),
        rosterTop: el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null,
      }
    })

    expect(rosterTop, '#roster should exist on the home page').not.toBeNull()
    expect(scrollY, 'should not have been reset to the top of the page').toBeGreaterThan(200)
    // Within a sticky-header's height of the section start.
    expect(Math.abs(scrollY - rosterTop!)).toBeLessThan(300)
  })
})
