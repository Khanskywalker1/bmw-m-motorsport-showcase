import { CARS } from '@/content'
import { HomeHero } from '@/components/sections/home-hero'
import { LadderSequence } from '@/components/sections/ladder-sequence'
import { SeriesGrid } from '@/components/sections/series-grid'

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <LadderSequence cars={CARS} />
      <SeriesGrid />
    </>
  )
}
