import type { Metadata } from 'next'
import { ALL_ASSETS } from '@/content'

export const metadata: Metadata = {
  title: 'Colophon',
  description:
    'Image credits, sources and licensing for this unofficial BMW M Motorsport showcase.',
}

const PRESSCLUB = 'https://www.press.bmwgroup.com/global/photo/detail'

export default function ColophonPage() {
  const sorted = [...ALL_ASSETS].sort((a, b) => a.id.localeCompare(b.id))

  return (
    <div className="px-6 pb-24 pt-32">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-[clamp(2rem,6vw,4rem)] font-black uppercase leading-none tracking-[-0.02em] text-white">
          Colophon
        </h1>

        <div className="mt-12 space-y-6 text-[1.0625rem] leading-[1.75] text-ink-200">
          <p>
            This is an unofficial fan project, built as a portfolio piece. It is
            not affiliated with, endorsed by, or sponsored by BMW AG. All
            trademarks, model names and imagery are the property of BMW AG.
          </p>
          <p>
            Every photograph is BMW Group press material, obtained from{' '}
            <a
              href="https://www.press.bmwgroup.com/global/photo"
              className="underline decoration-ink-600 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
              rel="noreferrer noopener"
              target="_blank"
            >
              BMW Group PressClub
            </a>{' '}
            and used editorially, with credit. This site is non-commercial and
            carries no advertising.
          </p>
          <p>
            The moving footage on the BMW M4 GT3 EVO page is BMW Group press
            material from{' '}
            <a
              href="https://www.press.bmwgroup.com/global/tv-footage/detail/PF0008506/the-new-bmw-m4-gt3"
              className="underline decoration-ink-600 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
              rel="noreferrer noopener"
              target="_blank"
            >
              PressClub PF0008506
            </a>
            , &ldquo;BMW M4 GT3 Driving Scenes&rdquo;, &copy; BMW AG 2021. It
            shows the 2021 development car in camouflage &mdash; the generation
            before the EVO &mdash; and the page says so rather than implying
            otherwise.
          </p>
          <p>
            The moving footage on the BMW M3 Touring 24H page is BMW Group press
            material from{' '}
            <a
              href="https://www.press.bmwgroup.com/global/tv-footage/detail/PF0010127/the-new-bmw-m3-touring-24-h"
              className="underline decoration-ink-600 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
              rel="noreferrer noopener"
              target="_blank"
            >
              PressClub PF0010127
            </a>
            , &ldquo;The new BMW M3 Touring 24 H&rdquo;, &copy; BMW AG 2026. It
            shows the car in its reveal camouflage during testing, not the
            livery it raced at the N&uuml;rburgring. The circuit is not
            identified in the footage and is not named here.
          </p>
          <p>
            The moving footage on the BMW M Hybrid V8 page is BMW Group press
            material from{' '}
            <a
              href="https://www.press.bmwgroup.com/global/tv-footage/detail/PF0009833/fia-wec-bapco-energies-8-hours-of-bahrain-press-footage"
              className="underline decoration-ink-600 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
              rel="noreferrer noopener"
              target="_blank"
            >
              PressClub PF0009833
            </a>
            , &copy; BMW AG 2024 &mdash; a pit stop during the 8 Hours of
            Bahrain, not Le Mans.
          </p>
          <p>
            The moving footage on the BMW M4 GT4 EVO page is BMW Group press
            material from{' '}
            <a
              href="https://www.press.bmwgroup.com/global/tv-footage/detail/PF0009843/gt4-european-series-jeddah-press-footage"
              className="underline decoration-ink-600 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
              rel="noreferrer noopener"
              target="_blank"
            >
              PressClub PF0009843
            </a>
            , &copy; BMW AG 2024. It was shot at the GT4 European Series round
            in Jeddah in December 2024, so it shows an M4 GT4 of that season
            rather than the EVO the page describes, and the page dates it
            accordingly.
          </p>
          <p className="text-ink-400">
            The BMW M2 Racing page carries no film: BMW Group PressClub
            publishes no TV footage of the car. The only M2 entry in the
            archive is the road car, which would be the wrong vehicle.
          </p>
          <p className="text-ink-400">
            Technical specifications are shown only where they could be
            verified against a BMW Group source. Figures still awaiting
            verification are deliberately omitted rather than estimated.
          </p>
        </div>

        <h2 className="mt-16 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-ink-400">
          Image credits · {sorted.length} photographs
        </h2>
        <ul className="mt-8 divide-y divide-ink-800 border-t border-ink-800">
          {sorted.map((asset) => (
            <li key={asset.id} className="py-5">
              <a
                href={`${PRESSCLUB}/${asset.id}/x`}
                className="tabular font-display text-sm font-bold text-ink-100 underline decoration-ink-700 underline-offset-4 transition-colors hover:text-white"
                rel="noreferrer noopener"
                target="_blank"
              >
                {asset.id}
              </a>
              <p className="mt-1.5 text-[0.95rem] text-ink-300">{asset.caption}</p>
              <p className="mt-1 text-[13px] text-ink-400">
                © BMW AG / BMW Group PressClub
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
