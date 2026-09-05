import { getAsset } from '@/content'
import { withBasePath } from '@/lib/base-path'

type Props = {
  /** PressClub asset id, e.g. P90628256. */
  id: string
  /** Responsive sizes attribute. Defaults to full viewport width. */
  sizes?: string
  className?: string
  imgClassName?: string
  /** Set on the LCP image only. Everything else stays lazy. */
  priority?: boolean
  /** Override the manifest alt, e.g. when a caption already describes it. */
  alt?: string
}

const WIDTHS = [640, 1080, 1920] as const

/**
 * Renders one curated press image.
 *
 * Deliberately a server component with no load handler: the blur placeholder
 * is the <img>'s own background, so it shows during decode and is painted over
 * without any JavaScript. That keeps images working before hydration and for
 * anyone who never gets it.
 */
export function Picture({
  id,
  sizes = '100vw',
  className = '',
  imgClassName = '',
  priority = false,
  alt,
}: Props) {
  const asset = getAsset(id)

  // These are plain strings from assets.generated.json, so Next's basePath
  // does not apply to them — prefix explicitly or they 404 on a subpath deploy.
  const srcset = (kind: 'avif' | 'webp') =>
    WIDTHS.map((w) => `${withBasePath(asset[kind][String(w)]!)} ${w}w`).join(', ')

  return (
    <picture className={className}>
      <source type="image/avif" srcSet={srcset('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcset('webp')} sizes={sizes} />
      <img
        src={withBasePath(asset.webp['1080']!)}
        alt={alt ?? asset.alt}
        width={asset.width}
        height={asset.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'auto'}
        className={imgClassName}
        style={{
          backgroundImage: `url("${asset.lqip}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
    </picture>
  )
}
