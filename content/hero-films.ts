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
   * Footage is the reveal/test car in camouflage — not the race car, which ran
   * a different design at the Nürburgring.
   *
   * The camouflage in this clip is printed with fan replies to the 2025 April
   * Fools' post, in speech bubbles. Read off the ProRes master at full
   * resolution: "Why can't this be real??!", "I want this more than anything
   * right now", "This thing is actually quite awesome", "WOW... Love it!".
   * Beat 2 quotes one of those verbatim, so it describes what is on screen
   * rather than narrating around it.
   *
   * The rest is already verified in content/cars/m3-touring-24h.ts: the April
   * Fools' origin, fifth overall, the SPX class win. The circuit in the clip is
   * not identified and is not named.
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
        line: 'The replies became the paintwork. “Why can’t this be real??!”',
      },
      {
        at: [0.68, 0.98],
        kicker: 'Nürburgring 24 Hours · 2026',
        line: 'Fifth overall, and first in class. Ahead of most of the serious entries.',
      },
    ],
  },

  /**
   * Footage is a pit stop at the 8 Hours of Bahrain, Nov 2024 — the "Rookie
   * Test. Hypercar." scene, which is the one place in a WEC package the BMW
   * appears without a field of rivals around it.
   *
   * There is no EVO generation of this car, so unlike the M4 GT3 and M4 GT4
   * heroes no generational caveat is needed. What the copy must not do is
   * imply Le Mans: the 1999 win is named as history, and the footage is
   * explicitly labelled Bahrain, because it is Bahrain.
   *
   * Claims verified in content/cars/m-hybrid-v8.ts: the 1999 V12 LMR outright
   * win, the quarter-century absence from the top class, and 2026 being the
   * first season contesting WEC Hypercar and IMSA GTP simultaneously.
   */
  'm-hybrid-v8': {
    prefix: 'm-hybrid-v8-hero',
    beats: [
      {
        at: [0.04, 0.34],
        kicker: 'Bahrain · 2024',
        line: 'Endurance racing is won in the pit lane as much as on the track.',
      },
      {
        at: [0.36, 0.66],
        kicker: 'The long absence',
        line: 'A BMW last won Le Mans outright in 1999. Then it left the top class for twenty-five years.',
      },
      {
        at: [0.68, 0.98],
        kicker: 'BMW M Hybrid V8 · 2026',
        line: 'This is the car built to end that — now racing WEC and IMSA in the same season.',
      },
    ],
  },

  /**
   * Footage is the grid at the Jeddah Corniche Circuit under floodlights, GT4
   * European Series, Dec 2024: the #17 car in BMW M colours, its driver walking
   * up and getting in, then pulling away.
   *
   * ACCURACY: this is the 2024 season, so the copy must NOT present it as the
   * EVO — same caveat as the M4 GT3 hero, and beat 1 dates the footage so a
   * reader is not left to assume. Jeddah IS named on screen (the podium
   * backdrop reads "JEDDAH CORNICHE CIRCUIT"), so naming the circuit here is
   * verified rather than inferred — the opposite of the M4 GT3 clip, where the
   * track is deliberately left unnamed.
   *
   * The mixed-grid framing and the twelve-series/four-continents figure are
   * both carried as verified in content/cars/m4-gt4-evo.ts.
   */
  'm4-gt4-evo': {
    prefix: 'm4-gt4-hero',
    beats: [
      {
        at: [0.04, 0.34],
        kicker: 'Jeddah · December 2024',
        line: 'The class where amateurs and professionals line up on the same grid.',
      },
      {
        at: [0.36, 0.66],
        kicker: 'Where careers start',
        line: 'Which is why GT4 races produce results nobody forecast.',
      },
      {
        at: [0.68, 0.98],
        kicker: 'BMW M4 GT4 EVO · 2026',
        line: 'Twelve championships. Four continents. The rung most racing careers actually begin on.',
      },
    ],
  },
}

export const FILM_SLUGS = Object.keys(FILMS)
