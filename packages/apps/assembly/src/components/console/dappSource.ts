import { QueryParams } from '@evefrontier/dapp-kit'

/**
 * The dapp URL with the Assembly's item id and tenant, or null unless it is
 * https on another origin. A URL saved without a scheme is read as https, as
 * before. The iframe allows scripts and same-origin together, which only
 * sandboxes a dapp on a different origin, so one on the console's own origin
 * is refused.
 */
export function dappSource(
  url: string,
  itemId: string,
  tenant: string,
  consoleOrigin: string | undefined = globalThis.location?.origin,
): string | null {
  if (!url || /\s/.test(url)) return null
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(url)
    ? url
    : `https://${url}`
  try {
    const target = new URL(withScheme)
    if (target.protocol !== 'https:') return null
    if (consoleOrigin && target.origin === consoleOrigin) return null
    target.searchParams.set(QueryParams.ITEM_ID, itemId)
    if (tenant) target.searchParams.set(QueryParams.TENANT, tenant)
    return target.toString()
  } catch {
    return null
  }
}
