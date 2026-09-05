# BMW M Motorsport Showcase — Design Spec

**Date:** 2026-09-05
**Status:** Approved for implementation
**Implementer:** OpenCode (autonomous agent — this document is the complete handoff; assume no other context)

---

## 1. Goal

A static, animation-led showcase site for BMW M Motorsport's 2026 works racing programme.
Two purposes, both non-commercial:

1. A **portfolio showpiece** demonstrating scroll-choreography craft.
2. A **learning vehicle** for the GSAP / Lenis / Next.js animation stack.

Success means: it looks and feels like a piece of motorsport design, not a data table with
transitions bolted on; and every animation degrades correctly for users who don't want motion.

## 2. Hard constraints

- **Non-commercial only.** No ads, no monetisation, no merch. The asset licence below depends on this.
- **Imagery is BMW PressClub editorial material.** Free for editorial use. Every image must carry a
  credit, and the site must state it is unofficial and not affiliated with BMW AG. See §7.
- **No 3D models.** Fan-made BMW models exist but their Creative Commons licences cannot grant BMW's
  trademarks. The whole visual approach is 2D photographic choreography. Do not introduce Three.js,
  React Three Fiber, or a WebGL car.
- **No backend, no CMS, no runtime fetching.** Fully static output.
- **English only. No live timing / standings data** (goes stale, needs a backend).

## 3. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router, `output: 'export'` |
| Language | TypeScript, `strict: true` |
| Styling | Tailwind CSS v4, design tokens as CSS custom properties |
| Scroll | Lenis (smooth scroll) + GSAP ScrollTrigger (choreography) |
| Component motion | Framer Motion |
| Images | `next/image`, AVIF + WebP, generated at build |
| Validation | Zod, at build time |
| Tests | Vitest (content), Playwright (routes, a11y, budgets) |

## 4. Architecture

Four layers with enforced boundaries:

```
content/      typed data + zod schemas. ZERO React imports.
lib/motion/   motion primitives. ZERO content imports.
components/   composes content + motion.
app/          routes only. No business logic.
```

**This separation is the core design decision.** `lib/motion/` must be understandable and testable
without knowing BMW exists; `content/` must be correctable without touching animation code.
If either starts importing the other, the boundary has broken — fix it rather than working around it.

### Routes (exactly these — do not add more)

| Route | Content |
|---|---|
| `/` | Hero (M Hybrid V8 / Le Mans 2026) → customer ladder (GT3→GT4→M2) → series overview |
| `/cars/[slug]` | 5 static pages, one scroll narrative each |
| `/colophon` | Credits, per-image attribution, non-affiliation disclaimer |

Series are **attributes of cars, not routes.** They render as a section on `/` with filtering.
Do not create `/series/[slug]`.

## 5. Content model

One file per car in `content/cars/`, validated by zod at build time. A missing field or an
unresolvable asset reference **must fail the build**, never render as a broken image.

```ts
type Car = {
  slug: string
  name: string
  tier: 'prototype' | 'gt3' | 'gt4' | 'entry' | 'special'
  class: string              // 'LMDh', 'GT3', 'GT4', ...
  debutYear: number
  // Specs carry their own provenance so unverified figures can never render.
  // See the verification warning below — this is why it is a list, not flat fields.
  specs: { label: string; value: string; verified: boolean }[]
  series: SeriesRef[]
  livery: { primary: string; secondary: string; accent: string }
  narrative: { hook: string; body: string[] }
  results: { year: number; text: string }[]
  assets: { hero: AssetId; gallery: AssetId[] }
}
```

`livery` is load-bearing: each car carries its own palette and the page theme morphs between cars.
This is what makes the site read as a showcase rather than a template with five rows.

### The five cars

| slug | Name | Tier | Class | Debut | 2026 notes |
|---|---|---|---|---|---|
| `m-hybrid-v8` | BMW M Hybrid V8 | prototype | LMDh | 2023 | **Halo car.** Runs WEC Hypercar *and* IMSA GTP in 2026, both under BMW M Team WRT (RLL's 17-year run ended after 2025). ~Half the bodywork redesigned for 2026: narrower front, new splitter, smaller kidney grille, new lighting, Dallara-developed aero. Cars #24 (Vanthoor / van der Linde; + Frijns, Rast for enduros) and #25 (Eng / Wittmann; + Magnussen, Marciello). |
| `m4-gt3-evo` | BMW M4 GT3 EVO | gt3 | GT3 | 2025 | ~15 series in 2026: WEC LMGT3, IMSA GTD/GTD Pro, GTWC Europe/America/Asia, IGTC, DTM, ADAC GT Masters, NLS, Super GT, British GT, Italian GT, China GT, 24H Series. 2025 debut season: ~80 wins, 100+ podiums. |
| `m4-gt4-evo` | BMW M4 GT4 EVO | gt4 | GT4 | 2023 | 12 series across four continents in 2026. |
| `m2-racing` | BMW M2 Racing | entry | Clubsport | 2026 | **New for 2026.** Bottom of the customer ladder, replacing the M2 CS Racing. B48-based 2.0 L four-cylinder, **313 hp / 400 Nm** (verified). |
| `m3-touring-24h` | BMW M3 Touring 24H | special | Special | 2025 | Nürburgring 24h special. The oddity in the range — lean into that editorially. |

### The narrative spine

Le Mans 2026 is BMW's **first outright-victory attempt since the V12 LMR won in 1999.** That is the
site's emotional hook. The home hero should carry it. Do not bury it in a spec table.

### ⚠️ Specs requiring verification before launch

`bmw-m.com` is **bot-blocked** (fails at the HTTP/2 layer — I confirmed this; do not waste time
retrying it). Detailed per-car specs could not be machine-verified.

Only the M2 Racing figures above (313 hp / 400 Nm) and the roster/series/driver data are verified.

**Everything else — engine codes, power outputs, weights, transmissions — must be transcribed by
hand from bmw-m.com in a normal browser before launch.** Until then, set `verified: false` on
those entries in `specs[]` and **do not render them.** Filter on `verified` at the component
boundary, so an unverified figure cannot reach the DOM by accident. Rendering a plausible guess as
fact is the single worst failure mode available here. Prefer an absent spec row to a wrong one.

## 6. Asset pipeline

Three stages. The discovery mechanism below is **verified working** — implement it as described.

### Stage 1 — `content/assets.manifest.ts` (hand-curated)

Each entry: PressClub `P90xxxxxx` ID, photographer credit, description, which car it belongs to.

**How to find more IDs:** PressClub's photo search is client-side, so there is no search URL to
scrape. Instead, fetch motorsport **article** pages, which are plain HTML and contain
`mediapool.bmwgroup.com` URLs:

```
https://www.press.bmwgroup.com/global/article/detail/{ARTICLE_ID}/x?language=en
```

Known-good article IDs: `T0455110EN` (Roar Before the 24, 2026), `T0456791EN`
(M Motorsport News, 31 Mar 2026), `T0453019EN` (WRT takes over IMSA + WEC).

### Stage 2 — `scripts/fetch-assets.ts`

CDN path shape:

```
https://mediapool.bmwgroup.com/cache/P9/{YYYYMM}/{P90ID}/{P90ID}-{slug}-{width}px.jpg
```

**Critical:** widths are pre-rendered per asset and are NOT arbitrary. Requesting an unavailable
width returns a 404 (with a 1154-byte error body, so check the status code, not the size).
Max width **varies per asset** — I measured 2248px on one and exactly 2250px on another
(2248/2249/2251/2252 all 404 on the latter). **Do not hardcode a width.**

Discover the real widths and exact slug per asset from its photo detail page:

```
https://www.press.bmwgroup.com/global/photo/detail/{P90ID}/x
```

Parse the `mediapool` URLs out of that page, take the largest width, download to a gitignored
`assets/raw/`. On a 404 or a missing ID, **fail loudly naming the exact P90 ID** — never skip silently.

### Stage 3 — `scripts/process-assets.ts`

`sharp` → AVIF + WebP at 640 / 1080 / 1920 widths, plus a base64 LQIP blur placeholder per image.
Writes `content/assets.generated.json`. **Commit the processed derivatives** so builds are
reproducible offline and don't depend on BMW's CDN staying up. `assets/raw/` stays gitignored.

### Verified seed assets

| P90 ID | Max width | Subject |
|---|---|---|
| `P90628256` | 2248px | M Hybrid V8 — Roar Before the 24, Daytona, Jan 2026 |
| `P90589374` | 2250px | M Hybrid V8 — WEC, Lusail, Feb 2025 |
| `P90629976` | 2250px | M4 GT3 EVO — IGTC Bathurst 12 Hour, Feb 2026 |
| `P90633052` | 2250px | M4 GT3 EVO — NLS Nordschleife, Mar 2026 |
| `P90632889` | *discover* | M4 GT3 EVO — IMSA 12 Hours of Sebring, Mar 2026 |
| `P90633044` | *discover* | M4 GT4 EVO — IMSA Michelin Pilot Challenge, Sebring, Mar 2026 |

No M2 Racing or M3 Touring 24H assets located yet — harvest them from further articles.

## 7. Legal requirements (not optional)

- `/colophon` lists every image with its P90 ID and photographer credit.
- Footer on every page: **"Unofficial fan project. Not affiliated with, endorsed by, or sponsored by
  BMW AG. All trademarks and imagery are the property of BMW AG."**
- Images are used editorially. If the site ever becomes commercial, this licence lapses — stop.

## 8. Motion system

Five named primitives in `lib/motion/`. Reuse is what makes the site read as designed rather than
decorated — resist adding a sixth without a real reason.

| Primitive | Behaviour |
|---|---|
| `useParallax(depth)` | Layered depth plates; background moves at a fraction of scroll |
| `<MStripeWipe>` | The M tricolour (blue → violet → red) as a reveal mask. **The signature move — use sparingly so it stays special.** |
| `<PinnedPanel>` | ScrollTrigger pin + scrubbed content swap (the spec reveal) |
| `<KineticText>` | Per-word masked headline entrance |
| `<LiveryTheme>` | Morphs CSS custom properties between car palettes |

### Reduced motion — non-negotiable

**Every primitive must degrade to a plain opacity fade under `prefers-reduced-motion: reduce`,
and that path must be covered by a Playwright test.** Under reduced motion, all content must be
fully present and readable — never a pinned section the user can't scroll past, never text stuck
mid-reveal. This is where most animated portfolio sites quietly fail; getting it right is itself
part of what the piece demonstrates.

Also: never pin without a scrollable escape, and always clean up ScrollTriggers on unmount
(App Router remounts on navigation — leaked triggers cause scroll jank that is painful to debug).

## 9. Testing

**Vitest (content):** every car parses against the zod schema; every `AssetId` resolves to a real
generated file; no orphaned assets in the manifest; no spec field displayed while `verified: false`.

**Playwright (behaviour):**
- All 7 routes render without console errors
- No horizontal overflow at 375 / 768 / 1440 px
- Under `prefers-reduced-motion`, every route's full text content is present
- Hero image actually loads (not just that the `<img>` exists)

**Budgets, enforced in CI:** LCP < 2.0 s · initial JS < 150 KB gzip · hero AVIF < 250 KB.

Do not attempt to unit-test tween interpolation. Test the content contract and the
observable outcomes; the animation itself is verified by eye.

## 10. Definition of done

1. `npm run build` produces a static export with zero type and zod errors.
2. All Vitest and Playwright tests pass; CI budgets met.
3. All five car pages render with real PressClub imagery — no placeholders.
4. Reduced-motion path verified manually in a browser as well as in tests.
5. `/colophon` complete; disclaimer present in the footer of every page.
6. No unverified spec figure is displayed anywhere.

## 11. Build order (suggested)

1. Scaffold Next.js + TS + Tailwind; tokens and type scale.
2. `content/` schemas + the five car files (specs gated behind `verified`).
3. Asset pipeline (§6) — get real images on disk before building any UI.
4. `lib/motion/` primitives in isolation, each with a scratch demo route.
5. `/cars/[slug]` — the repeating unit; get one car excellent, then replicate.
6. `/` — hero and ladder, reusing the primitives.
7. `/colophon`, footer, a11y pass, budgets, tests.

Build the asset pipeline **before** the UI. Designing against placeholder boxes and swapping in
real photography later reliably produces layouts that don't survive contact with real images.
