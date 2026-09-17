/**
 * Stage 1 of the hero pipeline: pull source footage from PressClub.
 *
 * Downloads land in a gitignored assets/footage/; only the processed
 * derivatives in public/video/ are committed. That keeps the build
 * reproducible offline and stops CI pulling hundreds of MB off BMW's CDN.
 *
 * Which films, which seconds, and why: scripts/footage-sources.ts.
 *
 * The masters run to several GB each (the M3 Touring scene alone is 6.36 GB)
 * and the CDN honours HTTP range requests, so ffmpeg seeks straight to the
 * segment and copies out only what is needed.
 *
 * Format varies and the listing panels lie about it: the M4 GT3 and M3
 * Touring masters really are ProRes 422 HQ (~171-177 Mbps), but the Bahrain
 * and Jeddah masters are 25 Mbps H.264 despite their panels saying
 * "Quicktime AppleProRes". Both are still far better than the ~2.7 Mbps
 * preview, which is the point. That matters: the previews are only ~2.7 Mbps at 1080p, and
 * encoding a hero from one bakes in compression damage that no amount of
 * output bitrate recovers.
 */
import { mkdir, writeFile, stat, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { FOOTAGE, previewFile, segmentFile, type FootageSource } from './footage-sources'

const OUT_DIR = join(process.cwd(), 'assets', 'footage')
const BASE = 'https://mediapool.bmwgroup.com/download/edown/tvFootageDownload'

const previewUrl = (id: number) =>
  `${BASE}?filmSceneId=${id}&actEvent=tvFootageScenePreviewH264&attachment=1`
const masterUrl = (id: number) =>
  `${BASE}?filmSceneFileId=${id}&actEvent=tvFootageSceneHD&attachment=1`

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

/** Duration in seconds, or null if ffprobe cannot read the file at all. */
async function probeDuration(path: string): Promise<number | null> {
  return new Promise((resolve) => {
    const p = spawn('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', path,
    ])
    let out = ''
    p.stdout.on('data', (d) => (out += d.toString()))
    p.on('close', (c) => {
      const n = Number(out.trim())
      resolve(c === 0 && Number.isFinite(n) && n > 0 ? n : null)
    })
  })
}

async function exists(p: string) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function fetchPreview(f: FootageSource) {
  const out = join(OUT_DIR, previewFile(f))
  if (await exists(out)) {
    console.log(`skip     ${previewFile(f)} (present)`)
    return
  }
  console.log(`fetch    ${previewFile(f)} — ${f.title}`)
  const res = await fetch(previewUrl(f.sceneId))
  if (!res.ok) throw new Error(`filmSceneId=${f.sceneId} returned HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.byteLength < 1_000_000) {
    throw new Error(`filmSceneId=${f.sceneId} returned only ${buf.byteLength} bytes`)
  }
  await writeFile(out, buf)
  console.log(`         ${(buf.byteLength / 1e6).toFixed(1)} MB`)
}

async function fetchMasterSegment(f: FootageSource) {
  const out = join(OUT_DIR, segmentFile(f))
  if (await exists(out)) {
    console.log(`skip     ${segmentFile(f)} (present)`)
    return
  }
  const { start, duration } = f.segment
  console.log(
    `fetch    ${segmentFile(f)} — broadcast master, ${start}s +${duration}s ` +
      `(range request into a multi-GB file; takes several minutes)`
  )
  // -c copy, not a re-encode: the intermediate must stay pristine so every
  // output derives from the master rather than from another encode.
  await run('ffmpeg', [
    '-v', 'warning',
    '-ss', String(start),
    '-t', String(duration),
    '-i', masterUrl(f.sceneFileId),
    '-c', 'copy',
    '-y', out,
  ])

  // A rate-limited or truncated range fetch yields a short/plain-wrong file
  // that would otherwise only surface as a mysteriously brief hero.
  //
  // Validate by PROBING, not by guessing bytes. An earlier version required
  // ~10 MB/s on the assumption every master is ProRes; the Bahrain and Jeddah
  // masters are 25 Mbps H.264 (despite their listing panels saying
  // "Quicktime AppleProRes"), so a byte floor rejected perfectly good files.
  // Duration plus a readable video stream catches truncation whatever the codec.
  const { size } = await stat(out)
  const probed = await probeDuration(out)
  const shortfall = probed === null || probed < duration * 0.9
  if (shortfall || size < 1_000_000) {
    await rm(out, { force: true })
    throw new Error(
      `${segmentFile(f)} is truncated — got ${probed === null ? 'an unreadable file' : probed.toFixed(2) + 's'} ` +
        `(${(size / 1048576).toFixed(0)} MB) for a ${duration}s segment. Re-run to resume.`
    )
  }
  console.log(`         ${(size / 1048576).toFixed(1)} MB`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const only = process.argv[2]
  const targets = only ? FOOTAGE.filter((f) => f.slug === only) : FOOTAGE
  if (!targets.length) {
    throw new Error(`no footage source for "${only}" — known: ${FOOTAGE.map((f) => f.slug).join(', ')}`)
  }
  for (const f of targets) {
    console.log(`\n── ${f.slug}  (${f.pf} · ${f.title})`)
    await fetchPreview(f)
    await fetchMasterSegment(f)
  }
  console.log('\nfootage ready in assets/footage/')
}

await main()
