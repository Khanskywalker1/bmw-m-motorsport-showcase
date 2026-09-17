/**
 * Stage 1 of the hero pipeline: pull source footage from PressClub.
 *
 * Downloads land in a gitignored assets/footage/; only the processed
 * derivatives in public/video/ are committed. That keeps the build
 * reproducible offline and stops CI pulling hundreds of MB off BMW's CDN.
 *
 * Which films, which seconds, and why: scripts/footage-sources.ts.
 *
 * The masters are ProRes 422 HQ and run to several GB each (the M3 Touring
 * scene alone is 6.36 GB). The CDN honours HTTP range requests and ProRes is
 * intra-frame, so ffmpeg seeks straight to the segment and copies out only
 * what is needed. That matters: the previews are only ~2.7 Mbps at 1080p, and
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
    `fetch    ${segmentFile(f)} — ProRes master, ${start}s +${duration}s ` +
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
  // that would otherwise only surface as a mysteriously brief hero. ProRes 422
  // HQ at 1080p25 runs ~20 MB/s, so anything under ~10 MB/s of segment is broken.
  const { size } = await stat(out)
  const floor = duration * 10 * 1024 * 1024
  if (size < floor) {
    await rm(out, { force: true })
    throw new Error(
      `${segmentFile(f)} came back only ${(size / 1048576).toFixed(0)} MB — ` +
        `expected at least ${(floor / 1048576).toFixed(0)} MB for ${duration}s of ProRes`
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
