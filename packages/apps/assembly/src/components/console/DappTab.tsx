import { QueryParams } from '@evefrontier/dapp-kit'

import { hostOf } from './format'

/**
 * Lets an attached dapp use the wallet, forms and popups. Without
 * allow-same-origin the dapp would lose its own storage and wallet
 * connection.
 */
const SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'

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

/**
 * The Assembly's attached dapp in a sandboxed iframe, with its host, an Open
 * in new tab link and the "outside of Frontier" warning.
 */
const DappTab = ({
  url,
  itemId,
  tenant,
}: {
  url: string
  itemId: string
  tenant: string
}) => {
  const src = dappSource(url, itemId, tenant)
  return (
    <div className="dapp">
      <p className="dapp-warn">
        <b>Att. Pilot</b>
        <span>You are interacting with an interface outside of Frontier.</span>
      </p>
      <div className="dapp-bar">
        <span className={`led ${src ? 'on' : ''}`} />
        <span className="dapp-host" title={src ?? url}>
          {hostOf(url)}
        </span>
        {src && (
          <a
            className="gbtn plain"
            href={src}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in new tab
          </a>
        )}
      </div>
      <div className="dapp-frame">
        {src ? (
          <iframe
            src={src}
            title={`Dapp for this Assembly: ${hostOf(url)}`}
            sandbox={SANDBOX}
            allow="clipboard-write"
          />
        ) : (
          <div className="dapp-ph">
            <span className="eyebrow">Not shown</span>
            <b>{hostOf(url)}</b>
            <span>Only https dapp addresses can be shown here.</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default DappTab
