import { test, expect } from '@playwright/test'

/*
 * The M4 GT3 page is the only route with a 3D hero. What must never regress is
 * the degradation: the photographic hero is the real content for anyone who
 * does not get WebGL, and a reduced-motion user must never be handed a canvas.
 *
 * The drift and the explosion themselves are verified by eye, in keeping with
 * the rest of this suite — what is asserted here is structural.
 */

const M4 = '/cars/m4-gt3-evo/'

test.describe('M4 GT3 3D hero', () => {
  test('reduced motion gets no canvas and keeps the full hero content', async ({
    page,
    browserName,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(M4)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).toContainText('M4 GT3')
    // The photographic hero must still be there, and decoded.
    const img = page.locator('main img').first()
    await expect(img).toBeVisible()
    expect(
      await img.evaluate((el: HTMLImageElement) => el.naturalWidth),
      `hero image did not decode in ${browserName}`
    ).toBeGreaterThan(0)
    // Give any stray async import a chance to mount something it shouldn't.
    await page.waitForTimeout(1500)
    await expect(page.locator('canvas')).toHaveCount(0)
  })

  test('the model and decoder are actually served', async ({ request }) => {
    for (const path of [
      '/model/m4-gt3-exploded.glb',
      '/draco/draco_wasm_wrapper.js',
      '/draco/draco_decoder.wasm',
    ]) {
      const res = await request.get(path)
      expect(res.status(), `${path} is not served`).toBe(200)
    }
  })

  test('no other car page mounts a canvas', async ({ page }) => {
    for (const slug of ['m-hybrid-v8', 'm4-gt4-evo', 'm2-racing', 'm3-touring-24h']) {
      await page.goto(`/cars/${slug}/`)
      await page.waitForTimeout(600)
      await expect(
        page.locator('canvas'),
        `${slug} should not have a 3D hero`
      ).toHaveCount(0)
    }
  })
})
