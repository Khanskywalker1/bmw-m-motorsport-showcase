/**
 * Which cars have a film hero, which files it uses, and the copy that rides on
 * it.
 *
 * This is deliberately NOT inside car-hero-video.tsx. That module is
 * `'use client'`, and a non-component export imported from a client module
 * into a server component arrives as a client-reference proxy rather than the
 * real value — `new Set(FILM_SLUGS)` in the route then fails with "function is
 * not iterable" at build time. Plain data belongs in a plain module.
 */
export type Beat = { at: [number, number]; kicker: string; line: string }
export type Film = { prefix: string; beats: Beat[] }

/**
 * Per-car film config: which files in public/video/, and the scroll-progress
 * windows for the detail beats (as fractions of the section).
 *
 * `prefix` must match the matching entry in scripts/footage-sources.ts, which
 * is what produced the files.
 *
 * ACCURACY RULE for beats: say what the footage actually shows, never imply a
 * car or era it does not depict, never name a circuit the clip does not
 * identify, and only cite figures already carried as verified in
 * content/cars/*.ts.
 */
export const FILMS: Record<string, Film> = {
  /**
   * Footage is the 2021 M4 GT3 development car in camouflage — the generation
   * BEFORE the EVO this page is about, and the copy says so rather than
   * letting a reader assume otherwise. The 2021 date is on the clip's own
   * slate; the ~80 wins are the EVO's 2025 debut season, already verified in
   * content/cars/m4-gt3-evo.ts. The circuit is deliberately unnamed — the
   * footage does not identify it.
   */
  'm4-gt3-evo': {
    prefix: 'm4-gt3-hero',
    beats: [
      {
        at: [0.04, 0.34],
        kicker: 'Development testing · 2021',
        line: 'It started as a prototype in camouflage.',
      },
      {
        at: [0.36, 0.66],
        kicker: 'The platform',
        line: 'Proving the car that would become the most widely raced GT3 BMW M builds.',
      },
      {
        at: [0.68, 0.98],
        kicker: 'BMW M4 GT3 EVO · 2025',
        line: 'The EVO followed — and won around eighty times in its debut season.',
      },
    ],
  },

  /**
   * Footage is the reveal/test car in camouflage, carrying "YOU DREAMED IT.
   * WE BUILT IT." on its flank — not the race car, which ran a different
   * design at the Nürburgring. Every claim below is already verified in
   * content/cars/m3-touring-24h.ts: the 2025 April Fools' origin, and fifth
   * overall with the SPX class win in 2026. The circuit in the clip is not
   * identified and is not named.
   */
  'm3-touring-24h': {
    prefix: 'm3-touring-hero',
    beats: [
      {
        at: [0.04, 0.34],
        kicker: 'April 2025',
        line: 'BMW floated a racing estate as an April Fools’ joke.',
      },
      {
        at: [0.36, 0.66],
        kicker: 'Testing in camouflage',
        line: 'The fans refused to let it go — so it got built. The answer is written on the car: you dreamed it, we built it.',
      },
      {
        at: [0.68, 0.98],
        kicker: 'Nürburgring 24 Hours · 2026',
        line: 'Fifth overall, and first in class. Ahead of most of the serious entries.',
      },
    ],
  },
}

export const FILM_SLUGS = Object.keys(FILMS)
