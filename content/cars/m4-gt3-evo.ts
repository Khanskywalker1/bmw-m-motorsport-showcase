import type { Car } from '../schema'

const NEEDS_CHECK = 'Unconfirmed — transcribe from bmw-m.com before display.'

export const m4Gt3Evo: Car = {
  slug: 'm4-gt3-evo',
  name: 'BMW M4 GT3 EVO',
  shortName: 'M4 GT3 EVO',
  tier: 'gt3',
  class: 'GT3',
  debutYear: 2025,
  tagline: 'The customer racing flagship — and the most widely raced car BMW M builds.',
  specs: [
    { label: 'Class', value: 'GT3', verified: true, source: 'BMW Group PressClub' },
    { label: 'Debut season', value: '2025', verified: true, source: 'BMW Group PressClub' },
    { label: 'Series in 2026', value: 'Around 15 worldwide', verified: true, source: 'BMW Group PressClub' },
    { label: 'Engine', value: 'P58 3.0-litre twin-turbo inline-six', verified: false, source: NEEDS_CHECK },
    { label: 'Power', value: '—', verified: false, source: NEEDS_CHECK },
    { label: 'Weight', value: '—', verified: false, source: NEEDS_CHECK },
    { label: 'Transmission', value: '—', verified: false, source: NEEDS_CHECK },
  ],
  series: [
    { id: 'wec', class: 'LMGT3' },
    { id: 'imsa', class: 'GTD / GTD Pro' },
    { id: 'gtwce', class: 'Pro / Gold / Silver' },
    { id: 'igtc' },
    { id: 'dtm' },
    { id: 'nls' },
    { id: 'n24', class: 'SP9' },
  ],
  livery: {
    primary: '#0653a6',
    secondary: '#7b2d8e',
    accent: '#e4002b',
    surface: '#0a0b0d',
  },
  narrative: {
    hook: 'Roughly eighty wins in its first season. Then it went back out and did 2026.',
    body: [
      'The M4 GT3 EVO is the car most BMW M customer teams actually race, and its debut year set an uncomfortable standard for its second: around 80 victories, more than 100 further podium finishes, and a stack of championship titles in 2025 alone.',
      'Breadth is the point. In 2026 it runs in roughly fifteen championships — WEC LMGT3, IMSA GTD and GTD Pro, GT World Challenge in Europe, America and Asia, the Intercontinental GT Challenge, DTM, ADAC GT Masters, NLS, Super GT, British GT, Italian GT, China GT and the 24H Series.',
      'That is the real trick of a GT3 car: it has to be quick in the hands of a factory professional at Spa and survivable for a bronze-rated amateur at three in the morning on the Nordschleife. The same car, the same weekend, entirely different jobs.',
    ],
  },
  results: [
    { year: 2025, text: 'Around 80 victories and over 100 additional podiums in its debut season.' },
    { year: 2026, text: 'Kelvin van der Linde and Charles Weerts defend the GT World Challenge Europe title with Team WRT.' },
    { year: 2026, text: 'Valentino Rossi contests all ten GTWC Europe rounds in the #46 car alongside Max Hesse.' },
  ],
  assets: {
    hero: 'P90629976',
    gallery: ['P90633052', 'P90632889'],
  },
}
