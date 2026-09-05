/**
 * Stage 2 of the asset pipeline: download the largest available original for
 * every id in the manifest into assets/raw/ (gitignored, re-fetchable).
 *
 * Why this is more involved than a URL template:
 *
 * mediapool serves only PRE-RENDERED widths per asset. There is no resizing
 * CDN — an unavailable width returns 404 with a ~1154-byte error body, so you
 * must check status, not size. Crucially the maximum width VARIES per asset
 * (2248, 2250 and 2278 all observed in this manifest), so it cannot be
 * hardcoded. We discover the real widths from each asset's detail page.
 */
import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { ASSETS } from '../content/assets.manifest.ts'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36'
const RAW_DIR = join(process.cwd(), 'assets', 'raw')
const DETAIL = (id: string) =>
  `https://www.press.bmwgroup.com/global/photo/detail/${id}/x`

type Variant = { url: string; width: number }

async function fetchOk(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res
}

async function getText(url: string): Promise<string> {
  return (await fetchOk(url)).text()
}

async function getBuffer(url: string): Promise<Buffer> {
  return Buffer.from(await (await fetchOk(url)).arrayBuffer())
}

/** Parse every mediapool variant for `id` out of its detail page. */
function parseVariants(html: string, id: string): Variant[] {
  const re = new RegExp(
    `https?://mediapool\\.bmwgroup\\.com/cache/P9/\\d{6}/${id}/[^"'\\s]+?-(\\d+)px\\.jpg`,
    'g'
  )
  const seen = new Map<string, Variant>()
  for (const m of html.matchAll(re)) {
    const url = m[0]
    const width = Number(m[1])
    if (Number.isFinite(width)) seen.set(url, { url, width })
  }
  return [...seen.values()].sort((a, b) => b.width - a.width)
}

async function exists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  await mkdir(RAW_DIR, { recursive: true })
  const index: Record<string, { width: number; source: string }> = {}
  const failures: string[] = []

  for (const asset of ASSETS) {
    const out = join(RAW_DIR, `${asset.id}.jpg`)
    const metaPath = join(RAW_DIR, `${asset.id}.json`)

    if ((await exists(out)) && (await exists(metaPath))) {
      const meta = JSON.parse(await readFile(metaPath, 'utf8'))
      index[asset.id] = meta
      console.log(`· ${asset.id} cached (${meta.width}px)`)
      continue
    }

    try {
      const html = await getText(DETAIL(asset.id))
      const variants = parseVariants(html, asset.id)
      if (variants.length === 0) {
        throw new Error(
          `no mediapool variants found on detail page — the asset id may be wrong or withdrawn`
        )
      }
      const best = variants[0]!
      const bytes = await getBuffer(best.url)
      // A 404 body is ~1154 bytes of HTML; a real press JPEG is far larger.
      if (bytes.length < 20_000) {
        throw new Error(
          `suspiciously small download (${bytes.length} bytes) from ${best.url}`
        )
      }
      await writeFile(out, bytes)
      const meta = { width: best.width, source: best.url }
      await writeFile(metaPath, JSON.stringify(meta, null, 2))
      index[asset.id] = meta
      console.log(
        `✓ ${asset.id} ${best.width}px (${(bytes.length / 1024).toFixed(0)} KB)  [${asset.car}]`
      )
    } catch (err) {
      // Fail loudly, naming the exact id — never skip silently.
      failures.push(`${asset.id} (${asset.car}): ${(err as Error).message}`)
      console.error(`✗ ${asset.id} — ${(err as Error).message}`)
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} asset(s) failed:`)
    for (const f of failures) console.error(`  - ${f}`)
    process.exit(1)
  }
  console.log(`\nfetched ${Object.keys(index).length} assets into assets/raw/`)
}

main()
