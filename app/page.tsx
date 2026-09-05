import { HomeHero } from '@/components/sections/home-hero'
import { Roster } from '@/components/sections/roster'
import { SeriesGrid } from '@/components/sections/series-grid'

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <Roster />
      <SeriesGrid />
    </>
  )
}
