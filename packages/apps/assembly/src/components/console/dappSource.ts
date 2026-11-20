import { QueryParams } from '@evefrontier/dapp-kit'

/**
 * An attached dapp's address as a URL, or null unless it is https. A URL
 * saved without a scheme is read as https, as before. The Dapp tab and the
 * details form both go by this, so they can't disagree.
 */
export function httpsUrl(url: string): URL | null {
  if (!url || /\s/.test(url)) return null
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(url)
    ? url
    : `https://${url}`
  try {
    const target = new URL(withScheme)
    return target.protocol === 'https:' ? target : null
  } catch {
    return null
  }
}

/**
 * The dapp URL with the Assembly's item id and tenant, or null unless it is
 * https (see {@link httpsUrl}).
 */
export function dappSource(
  url: string,
  itemId: string,
  tenant: string,
): string | null {
  const target = httpsUrl(url)
  if (!target) return null
  target.searchParams.set(QueryParams.ITEM_ID, itemId)
  if (tenant) target.searchParams.set(QueryParams.TENANT, tenant)
  return target.toString()
}
