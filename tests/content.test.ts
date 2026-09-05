import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ASSETS } from '@/content/assets.manifest'
import {
  CARS,
  ALL_ASSETS,
  HOME_HERO_ASSET,
  getAsset,
  carBySlug,
  displayableSpecs,
  seriesById,
} from '@/content'

/*
 * The content contract (spec section 9).
 *
 * Importing @/content already runs every car through zod, so a malformed car
 * file fails this suite at import time rather than in an assertion.
 */

const EXPECTED_SLUGS = [
  'm-hybrid-v8',
  'm4-gt3-evo',
  'm4-gt4-evo',
  'm2-racing',
  'm3-touring-24h',
] as const

const PUBLIC_DIR = path.resolve(import.meta.dirname, '..', 'public')

describe('cars', () => {
  it('contains exactly the five cars in the 2026 works roster', () => {
    expect(CARS.map((c) => c.slug)).toEqual([...EXPECTED_SLUGS])
  })

  it('resolves every car by slug', () => {
    for (const slug of EXPECTED_SLUGS) {
      expect(carBySlug(slug).slug).toBe(slug)
    }
  })

  it('throws on an unknown slug rather than returning undefined', () => {
    expect(() => carBySlug('m1-procar')).toThrow(/Unknown car slug/)
  })

  it('gives every car a non-empty narrative', () => {
    for (const car of CARS) {
      expect(car.narrative.hook.length).toBeGreaterThan(0)
      expect(car.narrative.body.length).toBeGreaterThan(0)
    }
  })

  it('points every series reference at a real series', () => {
    for (const car of CARS) {
      for (const ref of car.series) {
        expect(() => seriesById(ref.id)).not.toThrow()
      }
    }
  })
})

describe('spec verification gate', () => {
  it('never exposes an unverified spec row', () => {
    for (const car of CARS) {
      for (const spec of displayableSpecs(car)) {
        expect(
          spec.verified,
          `${car.slug} exposed unverified spec "${spec.label}"`
        ).toBe(true)
      }
    }
  })

  it('keeps unverified rows in the data so they can be filled in later', () => {
    // If this ever hits zero the placeholders were deleted rather than
    // verified, which would quietly lose the to-do list.
    const pending = CARS.flatMap((c) => c.specs).filter((s) => !s.verified)
    expect(pending.length).toBeGreaterThan(0)
  })

  it('records where every verified figure came from', () => {
    for (const car of CARS) {
      for (const spec of displayableSpecs(car)) {
        expect(spec.source, `${car.slug} / ${spec.label}`).toBeTruthy()
      }
    }
  })
})

describe('assets', () => {
  it('resolves every referenced asset id', () => {
    for (const car of CARS) {
      expect(() => getAsset(car.assets.hero)).not.toThrow()
      for (const id of car.assets.gallery) {
        expect(() => getAsset(id)).not.toThrow()
      }
    }
    expect(() => getAsset(HOME_HERO_ASSET)).not.toThrow()
  })

  it('throws a useful error for an unknown asset id', () => {
    expect(() => getAsset('P90000000')).toThrow(/npm run assets/)
  })

  it('has a real file on disk behind every generated derivative', () => {
    for (const asset of ALL_ASSETS) {
      for (const src of [
        ...Object.values(asset.avif),
        ...Object.values(asset.webp),
      ]) {
        const file = path.join(PUBLIC_DIR, src.replace(/^\//, ''))
        expect(existsSync(file), `missing ${src}`).toBe(true)
      }
    }
  })

  it('generates every manifest entry', () => {
    expect(ALL_ASSETS.map((a) => a.id).sort()).toEqual(
      ASSETS.map((a) => a.id).sort()
    )
  })

  it('has no orphaned assets — everything in the manifest is used', () => {
    const used = new Set<string>([HOME_HERO_ASSET])
    for (const car of CARS) {
      used.add(car.assets.hero)
      car.assets.gallery.forEach((id) => used.add(id))
    }
    const orphans = ASSETS.map((a) => a.id).filter((id) => !used.has(id))
    expect(orphans, `orphaned: ${orphans.join(', ')}`).toEqual([])
  })

  it('gives every asset alt text and a caption', () => {
    for (const asset of ALL_ASSETS) {
      expect(asset.alt.length, asset.id).toBeGreaterThan(10)
      expect(asset.caption.length, asset.id).toBeGreaterThan(5)
    }
  })

  it('carries a blur placeholder and real dimensions', () => {
    for (const asset of ALL_ASSETS) {
      expect(asset.lqip.startsWith('data:image/jpeg;base64,')).toBe(true)
      expect(asset.width).toBeGreaterThan(1000)
      expect(asset.height).toBeGreaterThan(0)
    }
  })
})
