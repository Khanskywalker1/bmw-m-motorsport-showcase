/**
 * Stage 1 of the hero-frame pipeline: pull the PressClub source clip.
 *
 * Mirrors scripts/fetch-assets.ts — the download lands in a gitignored
 * assets/footage/, and only the processed derivatives in public/frames/ are
 * committed. That keeps the build reproducible offline and stops CI from
 * pulling ~50 MB off BMW's CDN on every run.
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
 * NOTE ON SUBJECT: this is the 2021 development car in camouflage livery —
 * the pre-EVO M4 GT3. No EVO-era driving footage is published on PressClub
 * (only a walkaround). The hero copy frames it as development footage rather
 * than implying it is the EVO.
 */
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = join(process.cwd(), 'assets', 'footage')

type Scene = { id: number; file: string; note: string }

const SCENES: Scene[] = [
  { id: 17790, file: 'PF0008506_scene1.mp4', note: 'Driving scenes (hero source)' },
  { id: 17791, file: 'PF0008506_scene2_exterior.mp4', note: 'Studio exterior beauty shots' },
]

const url = (id: number) =>
  `https://mediapool.bmwgroup.com/download/edown/tvFootageDownload` +
  `?filmSceneId=${id}&actEvent=tvFootageScenePreviewH264&attachment=1`

async function exists(p: string) {
  try {
    await stat(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  for (const scene of SCENES) {
    const out = join(OUT_DIR, scene.file)
    if (await exists(out)) {
      console.log(`skip   ${scene.file} (already present)`)
      continue
    }
    console.log(`fetch  ${scene.file} — ${scene.note}`)
    const res = await fetch(url(scene.id))
    // Fail loudly and name the scene rather than writing a truncated file that
    // only shows up as a corrupt decode much later in the pipeline.
    if (!res.ok) {
      throw new Error(`filmSceneId=${scene.id} returned HTTP ${res.status} ${res.statusText}`)
    }
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength < 1_000_000) {
      throw new Error(`filmSceneId=${scene.id} returned only ${buf.byteLength} bytes — expected tens of MB`)
    }
    await writeFile(out, buf)
    console.log(`       ${(buf.byteLength / 1e6).toFixed(1)} MB`)
  }
  console.log('\nfootage ready in assets/footage/')
}

await main()
