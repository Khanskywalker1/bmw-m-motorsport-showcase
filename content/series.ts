import { seriesSchema, type Series } from './schema'

const raw = [
  { id: 'wec', abbr: 'FIA WEC', name: 'FIA World Endurance Championship',
    blurb: 'The global endurance championship, culminating at Le Mans.' },
  { id: 'imsa', abbr: 'IMSA', name: 'IMSA WeatherTech SportsCar Championship',
    blurb: 'North America’s premier sportscar series, from Daytona to Petit Le Mans.' },
  { id: 'gtwce', abbr: 'GTWC Europe', name: 'GT World Challenge Europe',
    blurb: 'Sprint and endurance GT3 racing across Europe, including Spa 24 Hours.' },
  { id: 'igtc', abbr: 'IGTC', name: 'Intercontinental GT Challenge',
    blurb: 'Five continents, five classic endurance races, one title.' },
  { id: 'nls', abbr: 'NLS', name: 'Nürburgring Langstrecken Serie',
    blurb: 'Endurance racing on the Nordschleife — the proving ground.' },
  { id: 'n24', abbr: '24h Nürburgring', name: 'Nürburgring 24 Hours',
    blurb: 'Twenty-four hours around the Green Hell, in front of a record crowd.' },
  { id: 'dtm', abbr: 'DTM', name: 'Deutsche Tourenwagen Masters',
    blurb: 'Germany’s headline GT3 sprint championship.' },
  { id: 'mpc', abbr: 'Pilot Challenge', name: 'IMSA Michelin Pilot Challenge',
    blurb: 'IMSA’s GT4-class support championship.' },
  { id: 'gt4-germany', abbr: 'ADAC GT4', name: 'ADAC GT4 Germany',
    blurb: 'National GT4 racing on the DTM support bill.' },
  { id: 'm2cup', abbr: 'BMW M2 Cup', name: 'BMW M2 Cup',
    blurb: 'New for 2026: a one-make cup on the DTM support programme, feeding the BMW M Racing Academy.' },
]

export const SERIES: Series[] = raw.map((s) => seriesSchema.parse(s))
export const SERIES_BY_ID = new Map(SERIES.map((s) => [s.id, s]))

export function seriesById(id: string): Series {
  const s = SERIES_BY_ID.get(id)
  if (!s) throw new Error(`Unknown series id: ${id}`)
  return s
}
