# BMW M Motorsport — 2026 Works Roster

An unofficial, non-commercial showcase of the BMW M Motorsport 2026 racing
roster, built as a portfolio piece. Static Next.js, scroll-driven animation,
real BMW Group press photography.

> **Unofficial fan project.** Not affiliated with, endorsed by, or sponsored by
> BMW AG. All trademarks and imagery are the property of BMW AG. Photography
> from BMW Group PressClub, used editorially with credit on `/colophon`.
> This licence depends on the site staying non-commercial.

Design spec: [`docs/superpowers/specs/2026-09-05-bmw-m-motorsport-showcase-design.md`](docs/superpowers/specs/2026-09-05-bmw-m-motorsport-showcase-design.md)

## Quick start

```bash
npm install
npm run assets     # fetch + process press imagery (only needed once)
npm run dev
```

`public/media/` is committed, so `npm run dev` works without running the asset
pipeline at all. You only need `npm run assets` after editing the manifest.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Static export to `out/` |
| `npm run assets` | Fetch originals, then generate AVIF/WebP derivatives |
| `npm test` | Content contract (Vitest) |
| `npm run test:e2e` | Routes, reduced motion, overflow (Playwright) |
| `npm run typecheck` | `tsc --noEmit` |

## Architecture

Four layers, with boundaries that are meant to stay intact:

```
content/      typed data + zod schemas.  ZERO React imports.
lib/motion/   motion primitives.         ZERO content imports.
components/   composes the two.
app/          routes only.
```

`lib/motion/` should be understandable without knowing BMW exists, and
`content/` should be correctable without touching animation code. If either
starts importing the other, the boundary has broken.

## Two things worth knowing before you change anything

**1. Unverified specs cannot be rendered — by construction.**

`bmw-m.com` blocks automated fetching, so most technical figures could not be
machine-verified. Rather than print a plausible guess, every spec row carries
its own `verified` flag and `displayableSpecs()` filters on it. To fill these
in, transcribe from bmw-m.com in a browser and flip the flag. Currently only
the M2 Racing figures (313 hp / 400 Nm) and class/series data are verified.

**2. The asset pipeline discovers image widths; it cannot guess them.**

`mediapool.bmwgroup.com` serves only pre-rendered widths, and the maximum
varies per asset — 2248, 2250, 2278 and 2279 all appear in this manifest.
A wrong width returns HTTP 404 with a ~1154-byte body, so check status codes,
not sizes. `scripts/fetch-assets.ts` reads the real widths from each asset's
PressClub detail page. Do not replace this with a URL template.

To add an image: find its `P90…` id (article pages embed mediapool URLs; the
photo *search* is client-side and cannot be scraped), add it to
`content/assets.manifest.ts`, then `npm run assets`.

## Motion

Five primitives in `lib/motion/`: `useParallax`, `KineticText`, `MStripeWipe`,
`PinnedPanel`, `LiveryTheme`.

GSAP and Lenis are loaded **dynamically**, inside effects, via
`useDeferredMotion`. Imported statically they add ~51 KB gzip to first load and
push the page past its JS budget, despite not running a frame until after
hydration.

**Reduced motion is a hard requirement.** Every primitive degrades to a plain
fade, nothing is pinned, and Lenis is disabled entirely. Content is rendered
visible in the markup and only hidden once JS confirms motion is wanted — so
"no JS yet" and "reduced motion" both mean *fully visible content*. This is
covered by a dedicated Playwright project; don't regress it.

## Budgets (enforced by the asset pipeline and checked in review)

| Budget | Status |
|---|---|
| Initial JS < 150 KB gzip | 129.7 KB (modern browsers; polyfills are `noModule`) |
| Hero AVIF < 250 KB | Largest 245 KB — the encoder steps quality down per image to fit |

## Deployment

CI lives in `.github/workflows/deploy.yml`: every push and PR runs typecheck,
content tests, Playwright across three projects, and the performance budgets;
pushes to `main` then build and publish to GitHub Pages.

**One manual step, once:** in the repo's *Settings → Pages*, set **Source** to
**GitHub Actions**. Without it `actions/configure-pages` fails and nothing
deploys.

The base path is read from `actions/configure-pages`, not hardcoded — the repo
can be renamed and the URLs follow. Locally, `NEXT_PUBLIC_BASE_PATH` does the
same job:

```bash
NEXT_PUBLIC_BASE_PATH=/my-repo npm run build
```

Three things that quietly break a Pages deploy, all handled here:

- **`public/.nojekyll`** — Jekyll ignores directories starting with `_`, which
  would drop the entire `_next/` bundle.
- **`trailingSlash: true`** — emits `/cars/foo/index.html`, so extensionless
  URLs resolve without host rewrite rules.
- **`withBasePath()`** in `lib/base-path.ts` — Next rewrites `<Link>` and its
  own assets, but *not* plain strings like the `/media/...` paths in
  `assets.generated.json`. Those go through this helper or they 404 on a
  project page.

`npm run assets` is deliberately not run in CI: `public/media/` is committed, so
builds are reproducible offline and CI never hammers BMW's press CDN.

## Licence

Code: do as you like. Imagery: © BMW AG, editorial use only — not covered by
any licence granted here.
