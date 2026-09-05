import type { Car } from '../schema'

const NEEDS_CHECK = 'Unconfirmed — transcribe from bmw-m.com before display.'

export const mHybridV8: Car = {
  slug: 'm-hybrid-v8',
  name: 'BMW M Hybrid V8',
  shortName: 'M Hybrid V8',
  tier: 'prototype',
  class: 'LMDh',
  debutYear: 2023,
  tagline: 'The first prototype BMW has aimed at outright Le Mans victory since 1999.',
  specs: [
    { label: 'Class', value: 'LMDh', verified: true, source: 'BMW Group PressClub' },
    { label: 'Category', value: 'Hypercar (WEC) · GTP (IMSA)', verified: true, source: 'BMW Group PressClub' },
    { label: 'Aero partner', value: 'Dallara', verified: true, source: 'BMW Group PressClub, 2026 update' },
    { label: 'Engine', value: 'P66/3 4.0-litre twin-turbo V8', verified: false, source: NEEDS_CHECK },
    { label: 'System power', value: '—', verified: false, source: NEEDS_CHECK },
    { label: 'Weight', value: '—', verified: false, source: NEEDS_CHECK },
    { label: 'Transmission', value: '—', verified: false, source: NEEDS_CHECK },
  ],
  series: [
    { id: 'wec', class: 'Hypercar' },
    { id: 'imsa', class: 'GTP' },
  ],
  livery: {
    primary: '#1c69d4',
    secondary: '#6f2c91',
    accent: '#e4002b',
    surface: '#070809',
  },
  narrative: {
    hook: 'Nineteen ninety-nine was the last time a BMW crossed the line first at Le Mans.',
    body: [
      'The V12 LMR won outright in 1999 and then BMW stepped away from the top class for a quarter of a century. The M Hybrid V8 is the car built to end that.',
      '2026 is the season it became a genuinely global effort. For the first time the same car contests both the FIA WEC Hypercar class and the IMSA GTP class, and for the first time both programmes run under one roof at BMW M Team WRT — closing a seventeen-year chapter with Rahal Letterman Lanigan Racing in North America.',
      'The car that turned up to do it is substantially new. Close to half the bodywork was redesigned for 2026: a narrower nose, a reworked front splitter, a smaller kidney grille, new lighting and revised side sections, with an aerodynamic package developed alongside Dallara to improve stability and cooling.',
    ],
  },
  results: [
    { year: 2026, text: 'First season contesting WEC Hypercar and IMSA GTP simultaneously, both with BMW M Team WRT.' },
    { year: 2026, text: 'Revised bodywork and aero package introduced, developed with Dallara.' },
  ],
  assets: {
    hero: 'P90628256',
    gallery: ['P90628257', 'P90589374', 'P90628252'],
  },
}
