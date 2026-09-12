/**
 * Stage 1 of the hero pipeline: pull source footage from PressClub.
 *
 * Downloads land in a gitignored assets/footage/; only the processed
 * derivatives in public/video/ are committed. That keeps the build
 * reproducible offline and stops CI pulling hundreds of MB off BMW's CDN.
 *
 * SOURCE — BMW Group PressClub TV footage PF0008506, "The new BMW M4 GT3"
 * (12 Aug 2021). Scene #1 is titled "BMW M4 GT3 Driving Scenes" on its own
 * slate and carries "© BMW AG 2021" there.
 *
 * NOTE ON LICENCE: unlike the stills, the PressClub video page states no
 * explicit licence or usage terms. PressClub operates an editorial-use model
 * throughout and this is credited on /colophon exactly as the photography is,
 * but that is inferred rather than stated. Confirm with
 * support.pressclub@bmwgroup.com before this goes public.
 *
 * NOTE ON SUBJECT: this is the 2021 development car in camouflage — the
 * pre-EVO M4 GT3. No EVO-era driving footage is published on PressClub (only
 * a walkaround). The hero copy frames it as development footage rather than
 * implying it is the EVO.
 */
import { mkdir, writeFile, stat, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const OUT_DIR = join(process.cwd(), 'assets', 'footage')

/** Preview copies — cheap, and what scene/segment selection was done against. */
const PREVIEWS = [
  { id: 17790, file: 'PF0008506_scene1.mp4', note: 'Driving scenes (hero source)' },
  { id: 17791, file: 'PF0008506_scene2_exterior.mp4', note: 'Studio exterior beauty shots' },
]

const previewUrl = (id: number) =>
  `https://mediapool.bmwgroup.com/download/edown/tvFootageDownload` +
  `?filmSceneId=${id}&actEvent=tvFootageScenePreviewH264&attachment=1`

/**
 * The broadcast master for scene 1: ProRes 422 HQ, 1920x1080 10-bit, ~177 Mbps.
 * The whole file is 4.97 GB, which is more than this machine has spare — but
 * the CDN honours HTTP range requests and ProRes is intra-frame, so ffmpeg can
 * seek straight to the segment and copy out only what is needed (~232 MB).
 *
 * This matters: the preview above is only 2.5 Mbps at 1080p, and encoding the
 * hero from it bakes in compression damage that no amount of output bitrate
 * recovers.
 */
const MASTER_URL =
  `https://mediapool.bmwgroup.com/download/edown/tvFootageDownload` +
  `?filmSceneFileId=19665&actEvent=tvFootageSceneHD&attachment=1`

/** Chosen by eye from 26 detected cuts — see process-footage.ts. */
export const SEGMENT = { start: 117.5, duration: 11 }
const SEGMENT_FILE = 'master_segment.mov'

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

async function fetchPreviews() {
  for (const scene of PREVIEWS) {
    const out = join(OUT_DIR, scene.file)
    if (await exists(out)) {
      console.log(`skip     ${scene.file} (present)`)
      continue
    }
    console.log(`fetch    ${scene.file} — ${scene.note}`)
    const res = await fetch(previewUrl(scene.id))
    if (!res.ok) throw new Error(`filmSceneId=${scene.id} returned HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength < 1_000_000) {
      throw new Error(`filmSceneId=${scene.id} returned only ${buf.byteLength} bytes`)
    }
    await writeFile(out, buf)
    console.log(`         ${(buf.byteLength / 1e6).toFixed(1)} MB`)
  }
}

async function fetchMasterSegment() {
  const out = join(OUT_DIR, SEGMENT_FILE)
  if (await exists(out)) {
    console.log(`skip     ${SEGMENT_FILE} (present)`)
    return
  }
  console.log(
    `fetch    ${SEGMENT_FILE} — ProRes master, ${SEGMENT.start}s +${SEGMENT.duration}s ` +
      `(range request, ~230 MB of a 4.97 GB file; takes several minutes)`
  )
  // -c copy, not a re-encode: the intermediate must stay pristine so every
  // output below derives from the master rather than from another encode.
  await run('ffmpeg', [
    '-v', 'warning',
    '-ss', String(SEGMENT.start),
    '-t', String(SEGMENT.duration),
    '-i', MASTER_URL,
    '-c', 'copy',
    '-y', out,
  ])

  // A rate-limited or truncated range fetch yields a short/plain-wrong file
  // that would otherwise only surface as a mysteriously brief hero.
  const { size } = await stat(out)
  if (size < 150 * 1024 * 1024) {
    await rm(out, { force: true })
    throw new Error(`master segment came back only ${(size / 1048576).toFixed(0)} MB — expected ~230 MB`)
  }
  console.log(`         ${(size / 1048576).toFixed(1)} MB`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  await fetchPreviews()
  await fetchMasterSegment()
  console.log('\nfootage ready in assets/footage/')
}

await main()
