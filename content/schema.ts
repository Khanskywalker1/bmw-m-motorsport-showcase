import { z } from 'zod'

/**
 * Content schemas. Parsed at build time — a malformed car file or an
 * unresolvable asset id fails the build rather than rendering broken.
 *
 * This module must never import React or anything from lib/motion.
 */

export const TIERS = ['prototype', 'gt3', 'gt4', 'entry', 'special'] as const
export type Tier = (typeof TIERS)[number]

/**
 * A single spec row carries its own provenance.
 *
 * bmw-m.com is bot-blocked, so most figures have to be transcribed by hand.
 * Rows with `verified: false` are filtered out at the component boundary and
 * cannot reach the DOM — showing a plausible guess as fact is the worst
 * failure mode available to this project, so the type makes it impossible.
 */
export const specSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  verified: z.boolean(),
  /** Where the figure came from, or what still needs checking. */
  source: z.string().optional(),
})

export const seriesRefSchema = z.object({
  id: z.string().min(1),
  /** The class this car runs in within that series, e.g. 'GTP', 'LMGT3'. */
  class: z.string().optional(),
})

export const liverySchema = z.object({
  primary: z.string().regex(/^#[0-9a-f]{6}$/i),
  secondary: z.string().regex(/^#[0-9a-f]{6}$/i),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  /** Page background when this car is on screen. */
  surface: z.string().regex(/^#[0-9a-f]{6}$/i),
})

export const carSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  shortName: z.string().min(1),
  tier: z.enum(TIERS),
  class: z.string().min(1),
  debutYear: z.number().int().min(1970).max(2030),
  /** One line under the name. Sets the tone; not a spec. */
  tagline: z.string().min(1),
  specs: z.array(specSchema),
  series: z.array(seriesRefSchema),
  livery: liverySchema,
  narrative: z.object({
    hook: z.string().min(1),
    body: z.array(z.string().min(1)).min(1),
  }),
  results: z.array(
    z.object({ year: z.number().int(), text: z.string().min(1) })
  ),
  assets: z.object({
    hero: z.string().min(1),
    gallery: z.array(z.string().min(1)),
  }),
})

export const seriesSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  abbr: z.string().min(1),
  blurb: z.string().min(1),
})

export type Spec = z.infer<typeof specSchema>
export type Livery = z.infer<typeof liverySchema>
export type Car = z.infer<typeof carSchema>
export type Series = z.infer<typeof seriesSchema>

/** Only verified rows may be rendered. The single place this rule lives. */
export function displayableSpecs(car: Car): Spec[] {
  return car.specs.filter((s) => s.verified)
}
