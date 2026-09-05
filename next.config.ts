import type { NextConfig } from 'next'

/**
 * GitHub Pages serves this from /<repo>, so a base path is prepended at build
 * time. It is read from the environment rather than hardcoded so local builds
 * and tests stay at the root.
 *
 * Note this does NOT rewrite plain string URLs like the ones in
 * assets.generated.json — see lib/base-path.ts, which is what components use.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''

const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  // Emits /cars/foo/index.html rather than /cars/foo.html, so static hosts
  // resolve extensionless URLs without rewrite rules.
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  // We generate AVIF/WebP derivatives ourselves in scripts/process-assets.ts,
  // so Next's optimizer is redundant (and unavailable under `output: 'export'`).
  images: { unoptimized: true },
}

export default nextConfig
