import type { Car } from '../schema'

const NEEDS_CHECK = 'Unconfirmed — transcribe from bmw-m.com before display.'

export const m4Gt4Evo: Car = {
  slug: 'm4-gt4-evo',
  name: 'BMW M4 GT4 EVO',
  shortName: 'M4 GT4 EVO',
  tier: 'gt4',
  class: 'GT4',
  debutYear: 2023,
  tagline: 'The middle rung — where amateurs and professionals share a grid.',
  specs: [
    { label: 'Class', value: 'GT4', verified: true, source: 'BMW Group PressClub' },
    { label: 'Series in 2026', value: 'Twelve worldwide', verified: true, source: 'BMW Group PressClub' },
    { label: 'Engine', value: 'S58 3.0-litre twin-turbo inline-six', verified: false, source: NEEDS_CHECK },
    { label: 'Power', value: '—', verified: false, source: NEEDS_CHECK },
    { label: 'Weight', value: '—', verified: false, source: NEEDS_CHECK },
    { label: 'Transmission', value: '—', verified: false, source: NEEDS_CHECK },
  ],
  series: [
    { id: 'mpc', class: 'GS' },
    { id: 'gt4-germany' },
    { id: 'nls' },
    { id: 'n24', class: 'SP10' },
  ],
  livery: {
    primary: '#2f7fd1',
    secondary: '#8a3fa0',
    accent: '#d81f3c',
    surface: '#0b0c0f',
  },
  narrative: {
    hook: 'GT4 is the class where the grid is genuinely mixed — and that is what makes it unpredictable.',
    body: [
      'The M4 GT4 EVO competes in a category aimed at newcomers, amateurs and professionals at the same time. That mixture is exactly why GT4 races produce results nobody forecast.',
      'In 2026 it runs in twelve series across Europe, North America, Asia and Australia — a quieter footprint than the GT3, but the rung where a great many racing careers actually begin.',
    ],
  },
  results: [
    { year: 2026, text: 'Contests twelve championships across four continents.' },
  ],
  assets: {
    hero: 'P90633044',
    gallery: [],
  },
}
