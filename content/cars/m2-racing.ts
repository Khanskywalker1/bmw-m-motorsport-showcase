import type { Car } from '../schema'

const NEEDS_CHECK = 'Unconfirmed — transcribe from bmw-m.com before display.'

export const m2Racing: Car = {
  slug: 'm2-racing',
  name: 'BMW M2 Racing',
  shortName: 'M2 Racing',
  tier: 'entry',
  class: 'Clubsport',
  debutYear: 2026,
  tagline: 'The bottom rung of the ladder, and the reason the ladder exists.',
  specs: [
    { label: 'Engine', value: '2.0-litre BMW TwinPower Turbo inline-four (B48-based)', verified: true, source: 'BMW Group PressClub' },
    { label: 'Power', value: '313 hp', verified: true, source: 'BMW Group PressClub' },
    { label: 'Torque', value: '400 Nm', verified: true, source: 'BMW Group PressClub' },
    { label: 'Debut season', value: '2026', verified: true, source: 'BMW Group PressClub' },
    { label: 'Weight', value: '—', verified: false, source: NEEDS_CHECK },
    { label: 'Transmission', value: '—', verified: false, source: NEEDS_CHECK },
  ],
  series: [
    { id: 'm2cup' },
    { id: 'n24', class: 'Cup' },
    { id: 'nls' },
  ],
  livery: {
    primary: '#e4002b',
    secondary: '#1c69d4',
    accent: '#f2f2f2',
    surface: '#0d0e11',
  },
  narrative: {
    hook: 'Every professional on the GT3 grid started somewhere much closer to this.',
    body: [
      'New for 2026, the M2 Racing is BMW M Motorsport’s entry point: a car aimed at promising talent, motorsport newcomers and grassroots racing, replacing the M2 CS Racing at the foot of the customer ladder.',
      'The specification is deliberately modest — a 2.0-litre four-cylinder producing 313 hp and 400 Nm. The point is not outright pace. It is a car a novice can learn in on a track day and an ambitious amateur can race hard, at a cost that does not end the career before it starts.',
      'It also arrives with a ladder attached. The new BMW M2 Cup runs across five weekends of the 2026 DTM calendar, and winning the title earns a place in the selection process for the BMW M Racing Academy.',
    ],
  },
  results: [
    { year: 2026, text: 'Debut season; deployed in national and international sprint series and endurance events including the 24 Hours of Nürburgring.' },
    { year: 2026, text: 'BMW M2 Cup premieres on the DTM support programme at the Lausitzring.' },
  ],
  assets: {
    hero: 'P90596731',
    gallery: ['P90596729', 'P90596732'],
  },
}
