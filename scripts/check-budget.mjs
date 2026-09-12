/**
 * Fails the build when the shipped page exceeds its budgets (spec section 9).
 *
 * Reads the real exported HTML rather than trusting `next build`'s summary,
 * and gzips the actual chunk files — that is what a browser downloads.
 *
 * Polyfills are excluded from the JS total: Next emits that bundle with the
 * `noModule` attribute, so no modern browser fetches it.
 */
import { readFile, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const OUT = join(process.cwd(), 'out')
const JS_BUDGET = 150 * 1024
const HERO_AVIF_BUDGET = 250 * 1024
// The M4 GT3 page has two heavy, non-initial payloads. Neither is fetched on
// page load, but "lazy" is not "free" — budget both explicitly rather than
// leaving them invisible to CI.
//
// The model is now strictly opt-in: it loads only when the reader presses the
// button on the diagram, so it is the one thing here most visitors never pay
// for at all.
const MODEL_BUDGET = 8 * 1024 * 1024
const DRACO_BUDGET = 300 * 1024
// The hero video IS fetched by anyone who opens the M4 GT3 page, so this is
// the number that actually matters for a typical visit. Budgeted per codec
// since a browser only ever downloads one of them.
const VIDEO_BUDGET = 3 * 1024 * 1024
const POSTER_BUDGET = 120 * 1024

let failed = false

function report(ok, label, actual, budget) {
  const pct = ((actual / budget) * 100).toFixed(0)
  const line = `${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(34)} ${(actual / 1024)
    .toFixed(1)
    .padStart(7)} KB / ${(budget / 1024).toFixed(0)} KB  (${pct}%)`
  console.log(line)
  if (!ok) failed = true
}

async function gzippedSize(file) {
  return gzipSync(await readFile(file)).length
}

async function checkPageJs(htmlPath, label) {
  const html = await readFile(htmlPath, 'utf8')
  const srcs = [
    ...new Set(
      [...html.matchAll(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g)].map(
        (m) => m[1]
      )
    ),
  ].filter((s) => !s.includes('polyfills'))

  let total = 0
  for (const src of srcs) {
    // Dynamic-route chunks are URL-encoded in the HTML (%5Bslug%5D), so the
    // path has to be decoded before it will resolve on disk.
    const rel = decodeURIComponent(src).replace(/^\//, '')
    total += await gzippedSize(join(OUT, rel))
  }
  report(total <= JS_BUDGET, label, total, JS_BUDGET)
}

async function checkVideo() {
  for (const [file, label] of [
    ['m4-gt3-hero.webm', 'hero video, AV1'],
    ['m4-gt3-hero.mp4', 'hero video, H.264'],
  ]) {
    const { size } = await stat(join(OUT, 'video', file))
    report(size <= VIDEO_BUDGET, label, size, VIDEO_BUDGET)
  }
  // The poster is the one piece every visitor pays for regardless of whether
  // autoplay is permitted, so it is budgeted separately and tightly.
  const { size } = await stat(join(OUT, 'video', 'm4-gt3-hero.jpg'))
  report(size <= POSTER_BUDGET, 'hero poster (JPEG fallback)', size, POSTER_BUDGET)
}

async function checkModel() {
  const glb = join(OUT, 'model', 'm4-gt3-exploded.glb')
  const { size } = await stat(glb)
  report(size <= MODEL_BUDGET, 'M4 GT3 GLB (opt-in)', size, MODEL_BUDGET)

  // Only the wasm path is counted: draco_decoder.js is the no-wasm fallback and
  // no current browser fetches it.
  let draco = 0
  for (const f of ['draco_wasm_wrapper.js', 'draco_decoder.wasm']) {
    draco += (await stat(join(OUT, 'draco', f))).size
  }
  report(draco <= DRACO_BUDGET, 'DRACO decoder (wasm path)', draco, DRACO_BUDGET)
}

async function checkImages() {
  const dir = join(OUT, 'media')
  const files = (await readdir(dir)).filter((f) => f.endsWith('-1920.avif'))
  let worst = { name: '', size: 0 }
  for (const f of files) {
    const { size } = await stat(join(dir, f))
    if (size > worst.size) worst = { name: f, size }
  }
  report(
    worst.size <= HERO_AVIF_BUDGET,
    `largest hero AVIF (${worst.name})`,
    worst.size,
    HERO_AVIF_BUDGET
  )
}

console.log('Performance budgets\n')
await checkPageJs(join(OUT, 'index.html'), 'home page JS (gzipped)')
await checkPageJs(join(OUT, 'cars', 'm-hybrid-v8', 'index.html'), 'car page JS (gzipped)')
// The 3D hero lives here, so this page must be measured too — the generic car
// page above is a different route output and would not catch a regression.
await checkPageJs(
  join(OUT, 'cars', 'm4-gt3-evo', 'index.html'),
  'M4 GT3 page JS (gzipped)'
)
await checkImages()
await checkVideo()
await checkModel()

if (failed) {
  console.error('\nBudget exceeded — see FAIL rows above.')
  process.exit(1)
}
console.log('\nAll budgets met.')
