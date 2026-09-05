import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  reactStrictMode: true,
  // We generate AVIF/WebP derivatives ourselves in scripts/process-assets.ts,
  // so Next's optimizer is redundant (and unavailable under `output: 'export'`).
  images: { unoptimized: true },
}

export default nextConfig
