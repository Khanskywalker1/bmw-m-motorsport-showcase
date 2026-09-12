/**
 * Stage 2 of the footage pipeline: source clip -> committed web video + poster.
 *
 * Output lands in public/video/ and IS committed, same contract as
 * public/media/: the build stays reproducible offline and CI never touches
 * BMW's CDN.
 *
 * SEGMENT CHOICE (117.0s -> 132.0s of scene 1) was made by eye. ffmpeg scene
 * detection found 26 cuts; this sits inside the longest continuous shot
 * (112.56 -> 135.08), across which the car approaches front-on, fills the
 * frame with headlights lit, then sweeps past showing the "1" door. One
 * unbroken camera move, so it reads as a single deliberate shot rather than
 * an edit, and it loops back to an empty-ish frame without a jarring jump.
 *
 * TWO CODECS: AV1 where the browser takes it (roughly half the bytes), H.264
 * as the universal fallback. The <video> element picks per-source order, so
 * no JS is involved in the choice.
 *
 * A POSTER matters more than usual here: autoplay can be refused (iOS low
 * power mode, data saver, some enterprise policies), and without a poster
 * that failure shows as a black rectangle where the hero should be.
 */
import { mkdir, rm, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import sharp from 'sharp'

const SRC = join(process.cwd(), 'assets', 'footage', 'PF0008506_scene1.mp4')
const OUT = join(process.cwd(), 'public', 'video')

const START = 117.0
const DURATION = 15.0
/** 1280 wide is plenty for a hero that is letterboxed behind text and moving. */
const WIDTH = 1280

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

const common = (extra: string[]) => [
  '-v', 'error',
  '-ss', String(START),
  '-t', String(DURATION),
  '-i', SRC,
  // Audio is dropped entirely: the hero is muted (autoplay requires it) and
  // an unused track is pure payload.
  '-an',
  '-vf', `scale=${WIDTH}:-2`,
  ...extra,
]

async function mb(p: string) {
  return (await stat(p)).size / 1048576
}

async function main() {
  await mkdir(OUT, { recursive: true })
  await rm(join(OUT, 'm4-gt3-hero.mp4'), { force: true })
  await rm(join(OUT, 'm4-gt3-hero.webm'), { force: true })

  console.log(`encode   ${START}s +${DURATION}s @ ${WIDTH}w`)

  // H.264 — universal fallback. faststart puts the moov atom first so the
  // browser can begin playing before the whole file arrives.
  await run('ffmpeg', common([
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', '26', '-preset', 'slow',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    join(OUT, 'm4-gt3-hero.mp4'),
  ]))
  console.log(`  h264   ${(await mb(join(OUT, 'm4-gt3-hero.mp4'))).toFixed(2)} MB`)

  // AV1 — much smaller where supported. row-mt + cpu-used keeps encode time sane.
  await run('ffmpeg', common([
    '-c:v', 'libsvtav1', '-crf', '38', '-preset', '6',
    '-pix_fmt', 'yuv420p',
    join(OUT, 'm4-gt3-hero.webm'),
  ]))
  console.log(`  av1    ${(await mb(join(OUT, 'm4-gt3-hero.webm'))).toFixed(2)} MB`)

  // Poster: first frame of the segment, matching what the video opens on.
  const tmp = join(OUT, '_poster.png')
  await run('ffmpeg', [
    '-v', 'error', '-ss', String(START), '-i', SRC, '-frames:v', '1',
    '-vf', `scale=${WIDTH}:-2`, '-y', tmp,
  ])
  await sharp(tmp).avif({ quality: 55 }).toFile(join(OUT, 'm4-gt3-hero.avif'))
  await sharp(tmp).jpeg({ quality: 72, mozjpeg: true }).toFile(join(OUT, 'm4-gt3-hero.jpg'))
  await rm(tmp, { force: true })
  console.log(
    `  poster ${(await mb(join(OUT, 'm4-gt3-hero.avif'))).toFixed(2)} MB avif / ` +
      `${(await mb(join(OUT, 'm4-gt3-hero.jpg'))).toFixed(2)} MB jpg`
  )
}

await main()
