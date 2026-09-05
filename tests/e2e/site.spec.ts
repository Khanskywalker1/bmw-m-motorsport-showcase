import { test, expect, type Page } from '@playwright/test'

/*
 * Behavioural checks (spec section 9).
 *
 * Deliberately not asserting on tween interpolation — that is verified by eye.
 * What is tested here is what must never regress: every route renders, nothing
 * overflows horizontally, and reduced-motion users get the complete content.
 */

const ROUTES = [
  '/',
  '/cars/m-hybrid-v8',
  '/cars/m4-gt3-evo',
  '/cars/m4-gt4-evo',
  '/cars/m2-racing',
  '/cars/m3-touring-24h',
  '/colophon',
] as const

/** trailingSlash: true means the export writes /foo/index.html. */
const url = (route: string) => (route === '/' ? '/' : `${route}/`)

async function gotoClean(page: Page, route: string) {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(url(route), { waitUntil: 'load' })
  return errors
}

test.describe('every route', () => {
  for (const route of ROUTES) {
    test(`${route} renders without console errors`, async ({ page }) => {
      const errors = await gotoClean(page, route)
      await expect(page.locator('h1')).toBeVisible()
      expect(errors, `console errors on ${route}`).toEqual([])
    })

    test(`${route} does not scroll horizontally`, async ({ page }) => {
      await page.goto(url(route))
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
      expect(overflow, `horizontal overflow on ${route}`).toBeLessThanOrEqual(1)
    })
  }
})

test.describe('hero imagery', () => {
  test('the home hero image actually decodes', async ({ page }) => {
    await page.goto('/')
    const img = page.locator('main img').first()
    await expect(img).toBeVisible()
    // naturalWidth is 0 for an <img> that failed to load, even though the
    // element itself is present and "visible".
    const decoded = await img.evaluate(
      (el: HTMLImageElement) => el.complete && el.naturalWidth > 0
    )
    expect(decoded, 'hero image did not load').toBe(true)
  })
})

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('home page shows its full text content', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: /nineteen ninety-nine/i })
    ).toBeVisible()
    // Every roster entry must be reachable, not stuck mid-reveal.
    await expect(page.getByRole('link', { name: /M Hybrid V8/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /M2 Racing/i }).first()).toBeVisible()
  })

  test('car page headings are not left hidden by an unplayed animation', async ({
    page,
  }) => {
    await page.goto(url('/cars/m3-touring-24h'))
    const h1 = page.getByRole('heading', { level: 1 })
    await expect(h1).toBeVisible()
    // The words must not be sitting translated out of their masks.
    const offsets = await page.$$eval('[data-word]', (els) =>
      els.map((el) => {
        const t = getComputedStyle(el).transform
        if (t === 'none') return 0
        const m = new DOMMatrixReadOnly(t)
        return Math.abs(m.m42)
      })
    )
    for (const y of offsets) expect(y).toBeLessThan(2)
  })

  test('the page is scrollable to the footer — nothing is pinned', async ({
    page,
  }) => {
    await page.goto('/')
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.getByText(/Unofficial fan project/i)).toBeVisible()
  })
})

test.describe('spec verification gate', () => {
  test('no unverified placeholder value is rendered', async ({ page }) => {
    for (const route of ROUTES) {
      await page.goto(url(route))
      const body = await page.locator('body').innerText()
      // "—" is the placeholder used for unverified figures in the content files.
      expect(
        body.includes('— ' + 'placeholder'),
        `placeholder leaked on ${route}`
      ).toBe(false)
    }
  })
})
