/**
 * Stage 2 of the hero pipeline: ProRes master segment -> committed web video.
 *
 * Output lands in public/video/ and IS committed, same contract as
 * public/media/: the build stays reproducible offline and CI never touches
 * BMW's CDN.
 *
 * Which films, which seconds, and why: scripts/footage-sources.ts.
 *
 * FOUR OUTPUTS PER CAR, two resolutions x two codecs. An earlier pass shipped a
 * single 1280x720 pair, which the hero then upscaled ~1.9x on a 2x display —
 * the dominant reason it looked soft. Desktop now gets native 1080p; phones
 * keep 720p so they are not made to pull four times the bytes for a screen that
 * cannot show the difference.
 *
 * AV1 is listed first in the markup and is what most browsers take; H.264 is
 * the fallback for Safari on Intel and older engines. Both are budgeted.
 */
import { mkdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import sharp from 'sharp'
import { FOOTAGE, segmentFile, type FootageSource } from './footage-sources'

const SRC_DIR = join(process.cwd(), 'assets', 'footage')
const OUT = join(process.cwd(), 'public', 'video')

type Variant = { suffix: string; width: number; codec: 'av1' | 'h264'; crf: number }

/**
 * CRF picked per codec and resolution rather than shared: AV1 and x264 CRF
 * scales are not comparable, and the 720p files can take a slightly harsher
 * setting because they are displayed smaller.
 */
const VARIANTS: Variant[] = [
  { suffix: '-1080.webm', width: 1920, codec: 'av1', crf: 30 },
  { suffix: '-1080.mp4', width: 1920, codec: 'h264', crf: 24 },
  { suffix: '-720.webm', width: 1280, codec: 'av1', crf: 32 },
  { suffix: '-720.mp4', width: 1280, codec: 'h264', crf: 25 },
]

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] })
    let err = ''
    p.stderr.on('data', (d) => (err += d.toString()))
    p.on('close', (c) =>
      c === 0 ? resolve() : reject(new Error(`${cmd} exited ${c}\n${err.slice(-2000)}`))
    )
  })
}

function encodeArgs(src: string, out: string, v: Variant): string[] {
  const base = [
    '-v', 'error',
    '-i', src,
    // Audio dropped entirely: the hero is muted (autoplay requires it), so an
    // audio track would be pure payload.
    '-an',
    // yuv420p is not optional — the ProRes source is 10-bit 4:2:2 and no
    // browser will decode that.
    '-vf', `scale=${v.width}:-2`,
    '-pix_fmt', 'yuv420p',
  ]
  if (v.codec === 'av1') {
    return [...base, '-c:v', 'libsvtav1', '-crf', String(v.crf), '-preset', '5', out]
  }
  return [
    ...base,
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', String(v.crf), '-preset', 'slow',
    // faststart puts the moov atom first so playback can begin before the
    // whole file has arrived.
    '-movflags', '+faststart',
    out,
  ]
}

async function probe(path: string) {
  return new Promise<{ w: number; h: number; pix: string; kbps: number }>((resolve, reject) => {
    const p = spawn('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,pix_fmt',
      '-show_entries', 'format=bit_rate',
      '-of', 'default=noprint_wrappers=1', path,
    ])
    let out = ''
    p.stdout.on('data', (d) => (out += d.toString()))
    p.on('close', (c) => {
      if (c !== 0) return reject(new Error(`ffprobe failed on ${path}`))
      const get = (k: string) => out.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1] ?? ''
      resolve({
        w: Number(get('width')),
        h: Number(get('height')),
        pix: get('pix_fmt'),
        kbps: Math.round(Number(get('bit_rate')) / 1000),
      })
    })
  })
}

/**
 * Encode down to a byte budget, stepping quality down until it fits. Returns
 * at the first quality that fits, so easy frames keep the best setting and only
 * busy ones pay. Floors at q40 rather than looping forever — below that the
 * poster would look worse than no poster.
 */
async function encodeToBudget(
  src: string,
  out: string,
  fmt: 'avif' | 'jpeg',
  startQuality: number,
  budget: number
) {
  for (let q = startQuality; q >= 40; q -= 6) {
    const img = sharp(src)
    await (fmt === 'avif' ? img.avif({ quality: q }) : img.jpeg({ quality: q, mozjpeg: true }))
      .toFile(out)
    const { size } = await stat(out)
    if (size <= budget) return { q, size }
  }
  const { size } = await stat(out)
  console.warn(`  warn: ${out.split('/').pop()} is ${(size / 1024).toFixed(0)} KB at the q40 floor`)
  return { q: 40, size }
}

async function processOne(f: FootageSource) {
  const src = join(SRC_DIR, segmentFile(f))
  try {
    await stat(src)
  } catch {
    throw new Error(`${segmentFile(f)} missing — run \`npm run footage:fetch\` first`)
  }

  console.log(`\n── ${f.slug}  (${f.pf} · ${f.title})`)
  const s = await probe(src)
  console.log(`source   ${s.w}x${s.h} ${s.pix} @ ${(s.kbps / 1000).toFixed(1)} Mbps`)

  for (const v of VARIANTS) {
    const name = `${f.prefix}${v.suffix}`
    const out = join(OUT, name)
    await rm(out, { force: true })
    process.stdout.write(`encode   ${name.padEnd(26)} ${v.codec} crf${v.crf} … `)
    await run('ffmpeg', ['-y', ...encodeArgs(src, out, v)])
    const { size } = await stat(out)
    const info = await probe(out)
    console.log(
      `${(size / 1048576).toFixed(2).padStart(6)} MB  ` +
        `${info.w}x${info.h} ${info.pix} @ ${(info.kbps / 1000).toFixed(2)} Mbps`
    )
  }

  // Poster at full width: it is what stands in when autoplay is refused
  // (iOS low power, data saver, policy), so it should not be the soft one.
  const tmp = join(OUT, `_poster_${f.prefix}.png`)
  await run('ffmpeg', ['-v', 'error', '-i', src, '-frames:v', '1', '-vf', 'scale=1920:-2', '-y', tmp])
  // Quality is targeted at a size, not fixed. A fixed q74 is fine for a clean
  // daylight shot but blew past the 140 KB poster budget on the Jeddah night
  // frame, which is full of floodlights, crowd and signage detail.
  await encodeToBudget(tmp, join(OUT, `${f.prefix}.avif`), 'avif', 58, 120 * 1024)
  await encodeToBudget(tmp, join(OUT, `${f.prefix}.jpg`), 'jpeg', 74, 130 * 1024)
  await rm(tmp, { force: true })
  const avif = (await stat(join(OUT, `${f.prefix}.avif`))).size
  const jpg = (await stat(join(OUT, `${f.prefix}.jpg`))).size
  console.log(`poster   ${(avif / 1024).toFixed(0)} KB avif / ${(jpg / 1024).toFixed(0)} KB jpg`)
}

async function main() {
  await mkdir(OUT, { recursive: true })
  const only = process.argv[2]
  const targets = only ? FOOTAGE.filter((f) => f.slug === only) : FOOTAGE
  if (!targets.length) {
    throw new Error(`no footage source for "${only}" — known: ${FOOTAGE.map((f) => f.slug).join(', ')}`)
  }
  for (const f of targets) await processOne(f)
}

await main()
