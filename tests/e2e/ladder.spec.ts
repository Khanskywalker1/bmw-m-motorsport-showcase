import { test, expect, type Page } from '@playwright/test'

/*
 * The Ladder scroll sequence.
 *
 * The failure this guards against is a real one that happened during the
 * build: ScrollTrigger measured the section before images and fonts had
 * loaded, so its bounds were stale and the sequence raced through all five
 * cars within a few hundred pixels. Asserting the scroll-to-chapter mapping
 * catches exactly that.
 */

const CARS = [
  'M Hybrid V8',
  'M4 GT3 EVO',
  'M4 GT4 EVO',
  'M2 Racing',
  'M3 Touring 24H',
] as const

/** Scroll so chapter `i` is centred, then let Lenis and ScrollTrigger settle. */
async function toChapter(page: Page, i: number) {
  await page.evaluate((idx) => {
    const s = document.getElementById('roster')!
    const start = s.getBoundingClientRect().top + window.scrollY
    const end = start + s.offsetHeight - window.innerHeight
    window.scrollTo(0, start + (idx / 4) * (end - start))
  }, i)
  await page.waitForTimeout(900)
}

test.describe('ladder sequence', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name === 'reduced-motion',
      'the sticky sequence is intentionally disabled under reduced motion'
    )
  })

  test('the section reserves one viewport of scroll per car', async ({ page }) => {
    await page.goto('/')
    const ratio = await page.evaluate(() => {
      const s = document.getElementById('roster')!
      return s.offsetHeight / window.innerHeight
    })
    expect(ratio).toBeGreaterThanOrEqual(4.5)
    expect(ratio).toBeLessThanOrEqual(5.5)
  })

  test('each chapter maps to the right car', async ({ page }) => {
    await page.goto('/')
    for (let i = 0; i < CARS.length; i++) {
      await toChapter(page, i)
      const rail = page.locator('[aria-current="true"]')
      await expect(rail, `chapter ${i} should be ${CARS[i]}`).toHaveAttribute(
        'aria-label',
        new RegExp(CARS[i]!.replace(/\s+/g, '\\s+'), 'i')
      )
    }
  })

  test('only one headline is legible at a time mid-transition', async ({ page }) => {
    await page.goto('/')
    // Sit exactly between two chapters — the position that used to render two
    // overlapping headlines on top of each other.
    await page.evaluate(() => {
      const s = document.getElementById('roster')!
      const start = s.getBoundingClientRect().top + window.scrollY
      const end = start + s.offsetHeight - window.innerHeight
      window.scrollTo(0, start + (2.5 / 4) * (end - start))
    })
    await page.waitForTimeout(900)
    const legible = await page.$$eval('#roster [id^="chapter-"]', (els) =>
      els
        .map((el) => {
          const copy = el.querySelector<HTMLElement>('[class*="pb-24"]')
          return copy ? Number(copy.style.opacity || '0') : 0
        })
        .filter((o) => o > 0.35).length
    )
    expect(legible).toBeLessThanOrEqual(1)
  })

  test('the rail jumps to a car when clicked', async ({ page }) => {
    await page.goto('/')
    await toChapter(page, 0)
    await page.getByRole('button', { name: /M3 Touring 24H/i }).click()
    await page.waitForTimeout(1600)
    await expect(page.locator('[aria-current="true"]')).toHaveAttribute(
      'aria-label',
      /M3\s+Touring\s+24H/i
    )
  })
})

test.describe('ladder under reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('every car is rendered in flow, with no sticky sequence', async ({
    page,
  }) => {
    await page.goto('/')
    const section = page.locator('#roster')
    // Not a tall scrubbed section: it collapses to normal document flow.
    //
    // This must be a retrying assertion, not a one-shot evaluate(). The server
    // renders the tall `height:500svh` sequence and the reduced-motion client
    // collapses it only after hydration, so reading the attribute once right
    // after goto() races that swap — it failed intermittently on the mobile
    // project, whose slower emulated device loses the race more often.
    await expect(section).not.toHaveAttribute('style', /svh/)

    for (const car of CARS) {
      await expect(
        page.getByRole('heading', { name: new RegExp(car, 'i') })
      ).toBeVisible()
    }
  })
})
