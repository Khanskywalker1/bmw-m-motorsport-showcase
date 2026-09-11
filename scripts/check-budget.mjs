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
// The M4 GT3 page ships a 3D hero. These are lazy — nothing fetches them until
// the canvas mounts — but "lazy" is not "free", so they are budgeted explicitly
// rather than left invisible to CI.
const MODEL_BUDGET = 8 * 1024 * 1024
const DRACO_BUDGET = 300 * 1024

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

async function checkModel() {
  const glb = join(OUT, 'model', 'm4-gt3-exploded.glb')
  const { size } = await stat(glb)
  report(size <= MODEL_BUDGET, 'M4 GT3 GLB (lazy)', size, MODEL_BUDGET)

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
await checkModel()

if (failed) {
  console.error('\nBudget exceeded — see FAIL rows above.')
  process.exit(1)
}
console.log('\nAll budgets met.')
