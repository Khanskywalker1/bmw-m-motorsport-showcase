import type { Car } from '../schema'

const NEEDS_CHECK = 'Unconfirmed — transcribe from bmw-m.com before display.'

export const m3Touring24h: Car = {
  slug: 'm3-touring-24h',
  name: 'BMW M3 Touring 24H',
  shortName: 'M3 Touring 24H',
  tier: 'special',
  class: 'SPX',
  debutYear: 2026,
  tagline: 'An April Fools’ joke that finished fifth overall at the Nürburgring 24 Hours.',
  specs: [
    { label: 'Class', value: 'SPX', verified: true, source: 'BMW Group PressClub' },
    { label: 'Team', value: 'Schubert Motorsport', verified: true, source: 'BMW Group PressClub' },
    { label: 'Engine', value: 'S58 3.0-litre twin-turbo inline-six', verified: false, source: NEEDS_CHECK },
    { label: 'Power', value: '—', verified: false, source: NEEDS_CHECK },
    { label: 'Weight', value: '—', verified: false, source: NEEDS_CHECK },
  ],
  series: [{ id: 'n24', class: 'SPX' }, { id: 'nls' }],
  livery: {
    primary: '#00a2df',
    secondary: '#6f2c91',
    accent: '#e4002b',
    surface: '#08090b',
  },
  narrative: {
    hook: 'BMW posted it as an April Fools’ joke. The fans refused to let it go.',
    body: [
      'In 2025 BMW M Motorsport floated a racing estate car as an April Fools’ gag. The reaction was strong enough — and sustained enough — that they went and built it.',
      'The BMW M3 Touring 24H made a spectacular racing debut at the NLS season opener, then lined up for the 24 Hours of Nürburgring in May 2026 in a new design, as an outright fan favourite in front of a record crowd.',
      'It then did the thing nobody scripted: fifth place overall and victory in the SPX class, with Jens Klingmann, Connor De Phillippi, Neil Verhagen and Ugo de Wilde sharing the #81 car. A joke that finished ahead of most of the serious entries.',
    ],
  },
  results: [
    { year: 2026, text: 'Fifth overall and SPX class winner at the 24 Hours of Nürburgring.' },
    { year: 2026, text: 'Racing debut at the NLS season opener on the Nordschleife.' },
  ],
  assets: {
    hero: 'P90641694',
    gallery: ['P90632552', 'P90641695', 'P90638356'],
  },
}
