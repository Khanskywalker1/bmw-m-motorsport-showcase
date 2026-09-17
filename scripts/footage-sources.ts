/**
 * Single source of truth for hero footage: which PressClub film each car's hero
 * comes from, and exactly which seconds of it.
 *
 * Both stages of the pipeline read this — fetch-footage.ts pulls the bytes,
 * process-footage.ts encodes them — so a segment can never drift between the
 * thing that was downloaded and the thing that was encoded.
 *
 * NOTE ON LICENCE: unlike the stills, PressClub video pages state no explicit
 * licence or usage terms. PressClub operates an editorial-use model throughout
 * and every clip is credited on /colophon exactly as the photography is, but
 * that is inferred rather than stated. Confirm with
 * support.pressclub@bmwgroup.com before this goes public.
 */

export type FootageSource = {
  /** Car slug this hero belongs to — matches content/cars/<slug>.ts. */
  slug: string
  /** Output filename stem in public/video/. */
  prefix: string
  /** PressClub film id, as credited on /colophon. */
  pf: string
  title: string
  /** Publication date on the PressClub entry. */
  date: string
  /** Preview (H.264) download id — cheap, and what segment picking is done against. */
  sceneId: number
  /** Broadcast master (ProRes 422 HQ) download id. Multi-GB; fetched by range. */
  sceneFileId: number
  segment: { start: number; duration: number }
  /** Why this segment, so the choice is auditable rather than magic numbers. */
  note: string
  /**
   * ACCURACY: what the footage actually shows. Hero copy must match this and
   * must not imply a car or an era the clip does not depict.
   */
  subject: string
}

export const FOOTAGE: FootageSource[] = [
  {
    slug: 'm4-gt3-evo',
    prefix: 'm4-gt3-hero',
    pf: 'PF0008506',
    title: 'The new BMW M4 GT3',
    date: '2021-08-12',
    sceneId: 17790,
    sceneFileId: 19665,
    segment: { start: 117.5, duration: 11 },
    note:
      'Inside the longest continuous shot (112.56 -> 135.08) of 26 detected cuts. ' +
      'The car approaches front-on, fills the frame with headlights lit, then sweeps ' +
      'past showing the "1" door. One unbroken camera move, so it reads as a ' +
      'deliberate shot rather than an edit, and it loops without a jarring jump.',
    subject:
      'The 2021 M4 GT3 development car in camouflage — the generation BEFORE the ' +
      'EVO that page is about. No EVO-era driving footage is published on PressClub.',
  },
  {
    slug: 'm3-touring-24h',
    prefix: 'm3-touring-hero',
    pf: 'PF0010127',
    title: 'The new BMW M3 Touring 24 H',
    date: '2026-03-16',
    // Scene 2 of 2. Scene 1 (id 20084) is mostly dark studio teaser material —
    // usable driving shots only appear in its last ~90s. Scene 2 is daylight
    // track driving end to end, so the hero comes from there.
    sceneId: 20085,
    sceneFileId: 21857,
    segment: { start: 242.0, duration: 11.5 },
    note:
      'A sustained front-on tracking shot: headlights lit, car filling the frame ' +
      'on track in daylight. Verified frame-by-frame at 0.5s intervals — the shot ' +
      'runs to ~254.2 before cutting to a wide, so 242.0 +11.5 leaves a 0.7s margin.',
    subject:
      'The M3 Touring 24H in its reveal camouflage during testing — not the livery ' +
      'it raced. The camo is printed with fan replies to the 2025 April Fools\' post ' +
      '("Why can\'t this be real??!"), which is what the hero copy quotes. The ' +
      'circuit is not identified in the footage and must not be named.',
  },
]

export const bySlug = (slug: string) => FOOTAGE.find((f) => f.slug === slug)

/**
 * Filenames derived from a source. These live here rather than in
 * fetch-footage.ts because that module runs `await main()` at import time —
 * importing it just to borrow a path helper would start a multi-GB download.
 */
export const previewFile = (f: FootageSource) => `${f.pf}_scene${f.sceneId}.mp4`
export const segmentFile = (f: FootageSource) => `${f.prefix}_master_segment.mov`
