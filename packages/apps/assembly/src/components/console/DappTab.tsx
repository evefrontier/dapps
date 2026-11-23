import { dappSource } from './dappSource'
import { hostOf } from './format'

/**
 * Lets an attached dapp use the wallet, forms and popups. Without
 * allow-same-origin the dapp would lose its own storage and wallet
 * connection.
 */
const SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'

/**
 * The Assembly's attached dapp in a sandboxed iframe, with its host, an Open
 * in new tab link and the "outside of Frontier" warning. With no URL
 * (`assembly-show-dapp`), a placeholder.
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
        <b>Att. Rider</b>
        <span>You are interacting with an interface outside of Frontier.</span>
      </p>
      <div className="dapp-bar">
        <span className={`led ${src ? 'on' : ''}`} />
        <span className="dapp-host" title={src ?? url}>
          {url ? hostOf(url) : '—'}
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
        ) : !url ? (
          <div className="dapp-ph">
            <span className="eyebrow">Not attached</span>
            <b>No dapp</b>
            <span>
              This Assembly has no dapp URL. Set one from Edit details.
            </span>
          </div>
        ) : (
          <div className="dapp-ph">
            <span className="eyebrow">Not shown</span>
            <b>{hostOf(url)}</b>
            <span>Only https dapps on another site can be shown here.</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default DappTab
