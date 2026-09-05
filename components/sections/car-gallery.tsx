import { getAsset } from '@/content'
import { Picture } from '@/components/ui/picture'
import type { Car } from '@/content/schema'

export function CarGallery({ car }: { car: Car }) {
  if (car.assets.gallery.length === 0) return null

  return (
    <section className="border-t border-ink-800 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-10 font-display text-[11px] font-bold uppercase tracking-[0.28em] text-ink-400">
          Gallery
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {car.assets.gallery.map((id, i) => {
            const asset = getAsset(id)
            // First image spans both columns when there is an odd number.
            const wide = car.assets.gallery.length % 2 === 1 && i === 0
            return (
              <figure key={id} className={wide ? 'sm:col-span-2' : undefined}>
                <Picture
                  id={id}
                  sizes={wide ? '100vw' : '(min-width: 640px) 50vw, 100vw'}
                  className="block overflow-hidden rounded-sm"
                  imgClassName="w-full h-auto"
                />
                <figcaption className="mt-3 text-[13px] text-ink-400">
                  {asset.caption}
                </figcaption>
              </figure>
            )
          })}
        </div>
      </div>
    </section>
  )
}
