/**
 * Curated BMW Group PressClub assets.
 *
 * PressClub's photo search is client-side, so there is no search URL to query.
 * These ids were harvested from article pages, which are plain HTML and embed
 * mediapool.bmwgroup.com URLs. To add more, fetch:
 *   https://www.press.bmwgroup.com/global/article/detail/{ARTICLE_ID}/x?language=en
 * and grep for `mediapool.bmwgroup.com`.
 *
 * Images are BMW Group press material, free for editorial use.
 * Every one of these is credited on /colophon. See spec section 7.
 */

export type AssetEntry = {
  /** PressClub asset id, e.g. P90628256. */
  id: string
  /** Car slug this belongs to. */
  car: string
  /** Alt text. Written for a screen reader, not for SEO. */
  alt: string
  /** Short caption shown in the UI and on /colophon. */
  caption: string
  /** Source article this was harvested from, for provenance. */
  article: string
}

export const ASSETS: AssetEntry[] = [
  // ── BMW M Hybrid V8 ────────────────────────────────────────────────────
  {
    id: 'P90628256',
    car: 'm-hybrid-v8',
    alt: 'Both BMW M Hybrid V8 prototypes, numbers 24 and 25, parked on the Daytona banking at night with their eight drivers standing between them',
    caption: "BMW M Team WRT driver line-up, Roar Before the 24, Daytona (USA), January 2026",
    article: 'T0455110EN',
  },
  {
    id: 'P90628252',
    car: 'm-hybrid-v8',
    alt: 'A BMW M Hybrid V8 prototype during night running at Daytona International Speedway',
    caption: "Roar Before the 24, Daytona (USA), January 2026",
    article: 'T0455110EN',
  },
  {
    id: 'P90628257',
    car: 'm-hybrid-v8',
    alt: 'The BMW M Motorsport IMSA fleet lined up on the Daytona banking at dusk, the M Hybrid V8 prototype in front of the M4 GT3 and M4 GT4 cars',
    caption: "BMW M Motorsport IMSA line-up, Daytona (USA), January 2026",
    article: 'T0455110EN',
  },
  {
    id: 'P90589374',
    car: 'm-hybrid-v8',
    alt: 'A BMW M Hybrid V8 leaving the BMW M Team WRT pit box under floodlights at Lusail',
    caption: "FIA WEC Prologue, Lusail (QAT), February 2025",
    article: 'T0453019EN',
  },

  // ── BMW M4 GT3 EVO ─────────────────────────────────────────────────────
  {
    id: 'P90629976',
    car: 'm4-gt3-evo',
    alt: 'A dark green BMW M4 GT3 EVO cresting a rise at Mount Panorama, passing BMW M trackside boards',
    caption: "Intercontinental GT Challenge, Bathurst 12 Hour (AUS), February 2026",
    article: 'T0456791EN',
  },
  {
    id: 'P90633052',
    car: 'm4-gt3-evo',
    alt: 'The number 77 BMW M4 GT3 EVO on the Nordschleife',
    caption: "Nürburgring Langstrecken Serie, Nordschleife (GER), March 2026",
    article: 'T0456791EN',
  },
  {
    id: 'P90632889',
    car: 'm4-gt3-evo',
    alt: 'A BMW M4 GT3 EVO during the Twelve Hours of Sebring',
    caption: "IMSA WeatherTech SportsCar Championship, Sebring (USA), March 2026",
    article: 'T0456791EN',
  },

  // ── BMW M4 GT4 EVO ─────────────────────────────────────────────────────
  {
    id: 'P90633044',
    car: 'm4-gt4-evo',
    alt: 'The white and blue number 27 BMW M4 GT4 EVO leading a yellow sister car through a corner at Sebring',
    caption: "IMSA Michelin Pilot Challenge, Sebring (USA), March 2026",
    article: 'T0456791EN',
  },

  // ── BMW M2 Racing ──────────────────────────────────────────────────────
  {
    id: 'P90596731',
    car: 'm2-racing',
    alt: 'The BMW M2 Racing in BMW M camouflage livery, lit from above in a dark studio',
    caption: "BMW M2 Racing presentation, DTM season opener, Oschersleben (GER), April 2025",
    article: 'T0449797EN',
  },
  {
    id: 'P90596729',
    car: 'm2-racing',
    alt: 'The BMW M2 Racing photographed from the front three-quarter in a dark studio',
    caption: "BMW M2 Racing presentation, Oschersleben (GER), April 2025",
    article: 'T0449797EN',
  },
  {
    id: 'P90596732',
    car: 'm2-racing',
    alt: 'The BMW M2 Racing in BMW M camouflage livery',
    caption: "BMW M2 Racing presentation, Oschersleben (GER), April 2025",
    article: 'T0449797EN',
  },

  // ── BMW M3 Touring 24H ─────────────────────────────────────────────────
  {
    id: 'P90632552',
    car: 'm3-touring-24h',
    alt: 'The BMW M3 Touring 24H race car, an estate bodyshell in full racing specification',
    caption: "BMW M3 Touring 24H reveal, March 2026",
    article: 'T0456339EN',
  },
  {
    id: 'P90641694',
    car: 'm3-touring-24h',
    alt: 'The number 81 BMW M3 Touring 24H taking the chequered flag at the start-finish line at the Nürburgring, a marshal waving the flag from the wall',
    caption: "Nürburgring 24 Hours, Nordschleife (GER), May 2026",
    article: 'T0457913EN',
  },
  {
    id: 'P90641695',
    car: 'm3-touring-24h',
    alt: 'The number 81 BMW M3 Touring 24H of Schubert Motorsport during the Nürburgring 24 Hours',
    caption: "Nürburgring 24 Hours, Nordschleife (GER), May 2026",
    article: 'T0457913EN',
  },
  {
    id: 'P90638356',
    car: 'm3-touring-24h',
    alt: 'The BMW M3 Touring 24H in its Nürburgring 24 Hours race livery',
    caption: "24h Nürburgring programme announcement, April 2026",
    article: 'T0457759EN',
  },
]

export const ASSET_IDS = ASSETS.map((a) => a.id)
