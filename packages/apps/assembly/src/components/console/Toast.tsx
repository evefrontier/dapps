import { getTxUrl } from '@evefrontier/dapp-kit'
import { useEffect, useState } from 'react'
import { useToast } from './ToastContext'
import { shortDigest } from './toastModel'

const EYEBROW = { sending: 'Sending', done: 'Done', failed: 'Failed' } as const

const CloseIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    aria-hidden="true"
  >
    <path d="M2 2l10 10M12 2L2 12" />
  </svg>
)

/**
 * The console's transaction toast, bottom right (full width on a phone). It
 * says what the action did in words: Sending while the wallet signs, then
 * Done with a link to the transaction (closing itself after 6 s, paused on
 * hover or focus) or Failed, which stays until dismissed. A long chain error
 * is folded under Show details.
 *
 * It sits outside `.gc`: the console is a CSS container, so a fixed toast
 * inside it would be placed against the console rather than the screen.
 */
const Toast = () => {
  const { toast, dismiss } = useToast()
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const id = toast?.id

  useEffect(() => {
    setOpen(false)
    setCopied(false)
  }, [id])

  const copy = (text: string) => {
    navigator.clipboard
      ?.writeText(text)
      .then(() => setCopied(true))
      .catch(() => {})
  }

  return (
    <div className="gc-toast-host" role="status">
      {toast && (
        <div
          className={`gc-toast ${toast.kind}`}
          role={toast.kind === 'failed' ? 'alert' : undefined}
        >
          <span className="k k1" />
          <span className="k k2" />
          <span className="k k3" />
          <span className="k k4" />
          <span className="tled" aria-hidden="true" />
          <div className="tb">
            <div className="ey">{EYEBROW[toast.kind]}</div>
            <div className="ti">{toast.title}</div>
            {toast.kind === 'sending' && (
              <div className="de">
                Sign it in your wallet. Controls stay locked until it lands.
              </div>
            )}
            {toast.kind === 'done' && (
              <div className="mt">
                <span>1 transaction · {shortDigest(toast.digest)}</span>
                <a
                  className="lk"
                  href={getTxUrl('sui:testnet', toast.digest)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View transaction ↗
                </a>
              </div>
            )}
            {toast.kind === 'failed' && (
              <>
                <div className="de">{toast.detail}</div>
                {toast.raw && open && <pre className="pre">{toast.raw}</pre>}
                {toast.raw && (
                  <div className="mt">
                    <button
                      type="button"
                      className="lk"
                      aria-expanded={open}
                      onClick={() => setOpen(!open)}
                    >
                      {open ? 'Hide details' : 'Show details'}
                    </button>
                    {open && (
                      <button
                        type="button"
                        className="lk"
                        onClick={() => copy(toast.raw ?? '')}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
          {toast.kind === 'sending' ? (
            <span className="x-gap" />
          ) : (
            <button
              type="button"
              className="x"
              aria-label="Dismiss"
              onClick={dismiss}
            >
              <CloseIcon />
            </button>
          )}
          {toast.kind === 'done' && (
            <span
              key={toast.id}
              className="bar"
              aria-hidden="true"
              onAnimationEnd={dismiss}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default Toast
