import { carSchema, type Car, type Spec } from './schema'
import generated from './assets.generated.json'
import { mHybridV8 } from './cars/m-hybrid-v8'
import { m4Gt3Evo } from './cars/m4-gt3-evo'
import { m4Gt4Evo } from './cars/m4-gt4-evo'
import { m2Racing } from './cars/m2-racing'
import { m3Touring24h } from './cars/m3-touring-24h'

export type GeneratedAsset = {
  id: string
  car: string
  alt: string
  caption: string
  article: string
  width: number
  height: number
  aspectRatio: number
  lqip: string
  avif: Record<string, string>
  webp: Record<string, string>
  dominant: string
}

const ASSET_MAP = generated as unknown as Record<string, GeneratedAsset>

/**
 * Resolve an asset id. Throws rather than returning undefined: these calls all
 * happen during the static build, so a bad id fails `next build` instead of
 * shipping a broken image.
 */
export function getAsset(id: string): GeneratedAsset {
  const asset = ASSET_MAP[id]
  if (!asset) {
    throw new Error(
      `Unknown asset id "${id}". Add it to content/assets.manifest.ts and run \`npm run assets\`.`
    )
  }
  return asset
}

export const ALL_ASSETS: GeneratedAsset[] = Object.values(ASSET_MAP)

/** Ordered by position on the ladder: prototype first, then descending. */
const RAW_CARS = [mHybridV8, m4Gt3Evo, m4Gt4Evo, m2Racing, m3Touring24h]

export const CARS: Car[] = RAW_CARS.map((car) => {
  const parsed = carSchema.parse(car)
  // Fail the build on a dangling asset reference, not at render time.
  getAsset(parsed.assets.hero)
  parsed.assets.gallery.forEach(getAsset)
  return parsed
})

export const CARS_BY_SLUG = new Map(CARS.map((c) => [c.slug, c]))

export function carBySlug(slug: string): Car {
  const car = CARS_BY_SLUG.get(slug)
  if (!car) throw new Error(`Unknown car slug: ${slug}`)
  return car
}

/** Only verified rows may be rendered — see content/schema.ts. */
export function displayableSpecs(car: Car): Spec[] {
  return car.specs.filter((s) => s.verified)
}

/** The image that opens the site: the whole IMSA fleet at dusk. */
export const HOME_HERO_ASSET = 'P90628257'

export * from './schema'
export { SERIES, seriesById } from './series'
