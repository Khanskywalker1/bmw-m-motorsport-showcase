import { test, expect } from '@playwright/test'
import { FILM_SLUGS } from '../../content/hero-films'

// Held literally rather than imported from '@/content': that barrel pulls in
// assets.generated.json, which the test loader rejects without an import
// attribute. FILM_SLUGS is the part that must not drift, and it is imported.
// A slug going stale here fails loudly as a 404 on navigation.
const ALL_CAR_SLUGS = [
  'm-hybrid-v8',
  'm4-gt3-evo',
  'm4-gt4-evo',
  'm2-racing',
  'm3-touring-24h',
]

/*
 * The M4 GT3 page is the only route with a video hero. What must never
 * regress is the degradation: the photographic hero is the real content for
 * anyone who does not get autoplay, and a reduced-motion user must never be
 * handed an autoplaying video.
 *
 * How the footage looks is verified by eye, in keeping with the rest of this
 * suite — what is asserted here is structural.
 */

const M4 = '/cars/m4-gt3-evo/'

test.describe('M4 GT3 video hero', () => {
  test('reduced motion gets no video and keeps the full hero content', async ({
    page,
    browserName,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(M4)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).toContainText('M4 GT3')
    // The photographic hero must still be there, and actually decoded.
    const img = page.locator('main img').first()
    await expect(img).toBeVisible()
    expect(
      await img.evaluate((el: HTMLImageElement) => el.naturalWidth),
      `hero image did not decode in ${browserName}`
    ).toBeGreaterThan(0)
    // Give any stray effect a chance to mount something it shouldn't.
    await page.waitForTimeout(1200)
    await expect(page.locator('video')).toHaveCount(0)
  })

  test('every hero video variant and the poster are served', async ({ request }) => {
    // All four, not just the pair a given browser happens to pick: a missing
    // fallback only ever shows up on the browsers least likely to be tested.
    for (const path of [
      '/video/m4-gt3-hero-1080.webm',
      '/video/m4-gt3-hero-1080.mp4',
      '/video/m4-gt3-hero-720.webm',
      '/video/m4-gt3-hero-720.mp4',
      '/video/m4-gt3-hero.jpg',
    ]) {
      const res = await request.get(path)
      expect(res.status(), `${path} is not served`).toBe(200)
    }
  })

  test('desktop gets the 1080p encode, narrow viewports get 720p', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(M4)
    const wide = page.locator('video')
    await expect(wide).toHaveJSProperty('videoWidth', 1920)

    await page.setViewportSize({ width: 420, height: 840 })
    // A full reload is required: `media` on <source> is evaluated at load and
    // is not re-checked on resize, so resizing alone would keep the 1080p file.
    await page.goto(M4)
    const narrow = page.locator('video')
    await expect(narrow).toHaveJSProperty('videoWidth', 1280)
  })

  test('the video plays, and a poster covers it if autoplay is refused', async ({ page }) => {
    // Explicitly ask for motion: this same file runs under the reduced-motion
    // project, where the absence of a video is the correct result and asserting
    // its presence would be asserting the opposite of the requirement.
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(M4)
    const video = page.locator('video')
    await expect(video).toHaveCount(1)
    // A poster is what stands in when autoplay is blocked, so its absence is
    // the difference between a still frame and a black rectangle.
    await expect(video).toHaveAttribute('poster', /m4-gt3-hero\.jpg/)
    // Autoplay requires both of these; without them iOS refuses outright.
    await expect(video).toHaveJSProperty('muted', true)
    await expect(video).toHaveJSProperty('playsInline', true)
  })

  /**
   * Driven off the registry rather than a hand-written list: when a car gains a
   * film, this test should start requiring a video for it automatically instead
   * of failing with a stale expectation. (It did exactly that when the M3
   * Touring film landed.)
   */
  test('every car matches the film registry', async ({ page }) => {
    for (const slug of ALL_CAR_SLUGS) {
      await page.goto(`/cars/${slug}/`)
      await page.waitForTimeout(500)
      // Under reduced motion the hero renders no <video> at all, for any car —
      // that is the whole point of the reduced-motion path, so the registry
      // does not apply there.
      const reduced = await page.evaluate(
        () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
      )
      const expected = !reduced && FILM_SLUGS.includes(slug) ? 1 : 0
      await expect(
        page.locator('video'),
        `${slug} should have ${expected} video hero(es)`
      ).toHaveCount(expected)
    }
  })
})
