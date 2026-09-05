/**
 * Prefix for asset URLs that Next does not rewrite itself.
 *
 * basePath in next.config.ts covers <Link> and framework-emitted assets, but
 * not raw strings such as the /media/... paths in assets.generated.json. Under
 * a project-page deploy those would 404, so every such URL goes through here.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''

export function withBasePath(url: string): string {
  if (!BASE_PATH) return url
  return url.startsWith('/') ? `${BASE_PATH}${url}` : url
}
