/**
 * Stage 2 of the hero pipeline: ProRes master segment -> committed web video.
 *
 * Output lands in public/video/ and IS committed, same contract as
 * public/media/: the build stays reproducible offline and CI never touches
 * BMW's CDN.
 *
 * SEGMENT (117.5s +11s of scene 1) was chosen by eye. ffmpeg scene detection
 * found 26 cuts; this sits inside the longest continuous shot (112.56 ->
 * 135.08), across which the car approaches front-on, fills the frame with
 * headlights lit, then sweeps past showing the "1" door. One unbroken camera
 * move, so it reads as a deliberate shot rather than an edit, and it loops
 * without a jarring jump.
 *
 * FOUR OUTPUTS, two resolutions x two codecs. An earlier pass shipped a single
 * 1280x720 pair, which the hero then upscaled ~1.9x on a 2x display — the
 * dominant reason it looked soft. Desktop now gets native 1080p; phones keep
 * 720p so they are not made to pull four times the bytes for a screen that
 * cannot show the difference.
 *
 * AV1 is listed first in the markup and is what most browsers take; H.264 is
 * the fallback for Safari on Intel and older engines. Both are budgeted.
 */
import { mkdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import sharp from 'sharp'

const SRC = join(process.cwd(), 'assets', 'footage', 'master_segment.mov')
const OUT = join(process.cwd(), 'public', 'video')

type Variant = {
  file: string
  width: number
  codec: 'av1' | 'h264'
  crf: number
}

/**
 * CRF picked per codec and resolution rather than shared: AV1 and x264 CRF
 * scales are not comparable, and the 720p files can take a slightly harsher
 * setting because they are displayed smaller.
 */
const VARIANTS: Variant[] = [
  { file: 'm4-gt3-hero-1080.webm', width: 1920, codec: 'av1', crf: 30 },
  { file: 'm4-gt3-hero-1080.mp4', width: 1920, codec: 'h264', crf: 24 },
  { file: 'm4-gt3-hero-720.webm', width: 1280, codec: 'av1', crf: 32 },
  { file: 'm4-gt3-hero-720.mp4', width: 1280, codec: 'h264', crf: 25 },
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

function encodeArgs(v: Variant): string[] {
  const base = [
    '-v', 'error',
    '-i', SRC,
    // Audio dropped entirely: the hero is muted (autoplay requires it), so an
    // audio track would be pure payload.
    '-an',
    // yuv420p is not optional — the ProRes source is 10-bit 4:2:2 and no
    // browser will decode that.
    '-vf', `scale=${v.width}:-2`,
    '-pix_fmt', 'yuv420p',
  ]
  if (v.codec === 'av1') {
    return [...base, '-c:v', 'libsvtav1', '-crf', String(v.crf), '-preset', '5', join(OUT, v.file)]
  }
  return [
    ...base,
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', String(v.crf), '-preset', 'slow',
    // faststart puts the moov atom first so playback can begin before the
    // whole file has arrived.
    '-movflags', '+faststart',
    join(OUT, v.file),
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

async function main() {
  await mkdir(OUT, { recursive: true })

  // Clear the previous generation, including the old un-suffixed names, so a
  // stale file can never be silently served after a rename.
  for (const f of [
    'm4-gt3-hero.mp4', 'm4-gt3-hero.webm',
    ...VARIANTS.map((v) => v.file),
  ]) {
    await rm(join(OUT, f), { force: true })
  }

  console.log(`source   ${SRC}`)
  const src = await probe(SRC)
  console.log(`         ${src.w}x${src.h} ${src.pix} @ ${(src.kbps / 1000).toFixed(1)} Mbps\n`)

  for (const v of VARIANTS) {
    process.stdout.write(`encode   ${v.file.padEnd(24)} ${v.codec} crf${v.crf} … `)
    await run('ffmpeg', ['-y', ...encodeArgs(v)])
    const { size } = await stat(join(OUT, v.file))
    const info = await probe(join(OUT, v.file))
    console.log(
      `${(size / 1048576).toFixed(2).padStart(6)} MB  ` +
        `${info.w}x${info.h} ${info.pix} @ ${(info.kbps / 1000).toFixed(2)} Mbps`
    )
  }

  // Poster at full width: it is what stands in when autoplay is refused
  // (iOS low power, data saver, policy), so it should not be the soft one.
  const tmp = join(OUT, '_poster.png')
  await run('ffmpeg', ['-v', 'error', '-i', SRC, '-frames:v', '1', '-vf', 'scale=1920:-2', '-y', tmp])
  await sharp(tmp).avif({ quality: 58 }).toFile(join(OUT, 'm4-gt3-hero.avif'))
  await sharp(tmp).jpeg({ quality: 74, mozjpeg: true }).toFile(join(OUT, 'm4-gt3-hero.jpg'))
  await rm(tmp, { force: true })
  const avif = (await stat(join(OUT, 'm4-gt3-hero.avif'))).size
  const jpg = (await stat(join(OUT, 'm4-gt3-hero.jpg'))).size
  console.log(
    `poster   ${(avif / 1024).toFixed(0)} KB avif / ${(jpg / 1024).toFixed(0)} KB jpg`
  )
}

await main()
