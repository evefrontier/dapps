/**
 * Lets an attached dapp use the wallet, forms and popups. Without
 * allow-same-origin the dapp would lose its own storage and wallet
 * connection.
 */
const SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox'

/**
 * The Dapp tab: the attached dapp in a sandboxed iframe, with its host, an
 * Open in new tab link and the "outside of Frontier" warning. With no `host`
 * (no URL), a placeholder; with a host but no `src` (not https), a note that
 * it can't be shown.
 */
const DappView = ({
  host,
  src,
}: {
  /** The dapp's host, or null when the Assembly has no dapp URL. */
  host: string | null
  /** What the iframe loads, or null when the URL is not https. */
  src: string | null
}) => (
  <div className="dapp">
    <p className="dapp-warn">
      <b>Att. Rider</b>
      <span>You are interacting with an interface outside of Frontier.</span>
    </p>
    <div className="dapp-bar">
      <span className={`led ${src ? 'on' : ''}`} />
      <span className="dapp-host" title={src ?? host ?? undefined}>
        {host ?? '—'}
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
          title={`Dapp for this Assembly: ${host}`}
          sandbox={SANDBOX}
          allow="clipboard-write"
        />
      ) : host === null ? (
        <div className="dapp-ph">
          <span className="eyebrow">Not attached</span>
          <b>No dapp</b>
          <span>This Assembly has no dapp URL. Set one from Edit details.</span>
        </div>
      ) : (
        <div className="dapp-ph">
          <span className="eyebrow">Not shown</span>
          <b>{host}</b>
          <span>Only https dapps on another site can be shown here.</span>
        </div>
      )}
    </div>
  </div>
)

export default DappView
