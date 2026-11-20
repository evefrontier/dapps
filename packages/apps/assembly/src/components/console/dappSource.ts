import { QueryParams } from '@evefrontier/dapp-kit'

/**
 * The dapp URL with the Assembly's item id and tenant, or null unless it is
 * https. A URL saved without a scheme is read as https, as before.
 */
export function dappSource(
  url: string,
  itemId: string,
  tenant: string,
): string | null {
  if (!url || /\s/.test(url)) return null
  const withScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(url)
    ? url
    : `https://${url}`
  try {
    const target = new URL(withScheme)
    if (target.protocol !== 'https:') return null
    target.searchParams.set(QueryParams.ITEM_ID, itemId)
    if (tenant) target.searchParams.set(QueryParams.TENANT, tenant)
    return target.toString()
  } catch {
    return null
  }
}
