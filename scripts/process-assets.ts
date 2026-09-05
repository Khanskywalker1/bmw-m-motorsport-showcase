/**
 * Stage 3: turn assets/raw/ originals into committed web derivatives.
 *
 * Output lands in public/media/ and IS committed, so the build is reproducible
 * offline and does not depend on BMW's CDN staying up. assets/raw/ is not.
 */
import { mkdir, writeFile, readFile, readdir, access } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { ASSETS } from '../content/assets.manifest.ts'

const RAW_DIR = join(process.cwd(), 'assets', 'raw')
const OUT_DIR = join(process.cwd(), 'public', 'media')
const GENERATED = join(process.cwd(), 'content', 'assets.generated.json')

const WIDTHS = [640, 1080, 1920] as const

/**
 * AVIF quality is tuned so the largest hero lands under the 250 KB budget the
 * spec sets. At q62 the Daytona night hero came out at 251 KB — just over.
 */
const AVIF_QUALITY = 58
const WEBP_QUALITY = 78

/** Spec budget: no hero AVIF over 250 KB. */
const MAX_AVIF_BYTES = 250 * 1024
/** Quality ladder walked downwards until an image fits the budget. */
const QUALITY_LADDER = [58, 52, 46, 40, 34]

/**
 * Encode to AVIF, stepping quality down until the result fits the budget.
 *
 * A flat quality setting cannot hold a size budget: a busy frame (the Daytona
 * fleet line-up, with a gradient sky and eight cars) came out at 319 KB while
 * a simple studio shot of the same dimensions landed near 90 KB. Only the
 * largest width is budgeted; 640 and 1080 are comfortably under regardless.
 */
async function encodeAvifWithinBudget(
  pipeline: sharp.Sharp,
  outPath: string,
  budgeted: boolean
): Promise<{ bytes: number; quality: number }> {
  const ladder = budgeted ? QUALITY_LADDER : [AVIF_QUALITY]
  let last = { bytes: 0, quality: ladder[0]! }
  for (const quality of ladder) {
    const buf = await pipeline.clone().avif({ quality, effort: 4 }).toBuffer()
    last = { bytes: buf.length, quality }
    if (!budgeted || buf.length <= MAX_AVIF_BYTES) {
      await writeFile(outPath, buf)
      return last
    }
  }
  // Ladder exhausted: write the smallest we managed and let the caller warn.
  const buf = await pipeline
    .clone()
    .avif({ quality: ladder[ladder.length - 1]!, effort: 4 })
    .toBuffer()
  await writeFile(outPath, buf)
  return { bytes: buf.length, quality: ladder[ladder.length - 1]! }
}

/** Re-encode even if the output already exists: FORCE=1 npm run assets:process */
const FORCE = process.env.FORCE === '1'

async function exists(p: string) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

export type GeneratedAsset = {
  id: string
  car: string
  alt: string
  caption: string
  article: string
  width: number
  height: number
  aspectRatio: number
  /** Tiny base64 JPEG shown while the real image decodes. */
  lqip: string
  avif: Record<number, string>
  webp: Record<number, string>
  /** Average colour, used to tint the placeholder before decode. */
  dominant: string
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const generated: Record<string, GeneratedAsset> = {}

  for (const asset of ASSETS) {
    const src = join(RAW_DIR, `${asset.id}.jpg`)
    const input = await readFile(src)
    const meta = await sharp(input).metadata()
    if (!meta.width || !meta.height) {
      throw new Error(`${asset.id}: could not read dimensions`)
    }

    const avif: Record<number, string> = {}
    const webp: Record<number, string> = {}

    for (const w of WIDTHS) {
      // Never upscale: a 640px-wide source stays 640px.
      const targetWidth = Math.min(w, meta.width)
      const base = sharp(input).resize({ width: targetWidth, withoutEnlargement: true })

      const avifName = `${asset.id}-${w}.avif`
      const webpName = `${asset.id}-${w}.webp`
      const avifPath = join(OUT_DIR, avifName)
      const webpPath = join(OUT_DIR, webpName)

      if (FORCE || !(await exists(avifPath))) {
        const isLargest = w === WIDTHS[WIDTHS.length - 1]
        const res = await encodeAvifWithinBudget(base, avifPath, isLargest)
        if (isLargest) {
          if (res.bytes > MAX_AVIF_BYTES) {
            console.warn(
              `  ! ${asset.id} @${w}: ${(res.bytes / 1024).toFixed(0)} KB still over budget at q${res.quality}`
            )
          } else if (res.quality !== AVIF_QUALITY) {
            console.log(
              `  · ${asset.id} @${w}: dropped to q${res.quality} to fit budget (${(res.bytes / 1024).toFixed(0)} KB)`
            )
          }
        }
      }
      if (FORCE || !(await exists(webpPath))) {
        await base.clone().webp({ quality: WEBP_QUALITY }).toFile(webpPath)
      }
      avif[w] = `/media/${avifName}`
      webp[w] = `/media/${webpName}`
    }

    const lqipBuf = await sharp(input)
      .resize({ width: 20 })
      .blur(1.2)
      .jpeg({ quality: 40 })
      .toBuffer()

    const { dominant } = await sharp(input).stats()
    const hex =
      '#' +
      [dominant.r, dominant.g, dominant.b]
        .map((c) => c.toString(16).padStart(2, '0'))
        .join('')

    generated[asset.id] = {
      id: asset.id,
      car: asset.car,
      alt: asset.alt,
      caption: asset.caption,
      article: asset.article,
      width: meta.width,
      height: meta.height,
      aspectRatio: Number((meta.width / meta.height).toFixed(4)),
      lqip: `data:image/jpeg;base64,${lqipBuf.toString('base64')}`,
      avif,
      webp,
      dominant: hex,
    }

    console.log(
      `✓ ${asset.id} ${meta.width}×${meta.height} → 3 widths, avg ${hex}`
    )
  }

  await writeFile(GENERATED, JSON.stringify(generated, null, 2))

  const files = await readdir(OUT_DIR)
  console.log(
    `\nwrote ${files.length} files to public/media/ and ${Object.keys(generated).length} entries to content/assets.generated.json`
  )
}

main()
