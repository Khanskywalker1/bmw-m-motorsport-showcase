'use client'

import { MStripeWipe, KineticText } from '@/lib/motion'
import type { Car } from '@/content/schema'

export function CarNarrative({ car }: { car: Car }) {
  return (
    <section className="px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <MStripeWipe className="mb-16 inline-block">
          <KineticText
            as="p"
            className="max-w-4xl text-balance font-display text-[clamp(1.6rem,4vw,3.1rem)] font-bold leading-[1.08] tracking-[-0.02em] text-white"
          >
            {car.narrative.hook}
          </KineticText>
        </MStripeWipe>

        <div className="grid gap-x-16 gap-y-8 lg:grid-cols-[1fr_1.4fr]">
          <h2 className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-ink-400">
            The story
          </h2>
          <div className="space-y-6 text-[1.0625rem] leading-[1.75] text-ink-200">
            {car.narrative.body.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
