import { useEffect, useState } from 'react'

import { CloseIcon } from './primitives'

/** What the toast shows, in each of its three states. */
export type ToastData =
  | { kind: 'sending'; title: string }
  | {
      kind: 'done'
      title: string
      /** The transaction's short hash, e.g. "8Kx2…qm4T". */
      digest: string
      /** Where "View transaction" goes. */
      href: string
    }
  | { kind: 'failed'; title: string; detail: string; raw?: string }

const EYEBROW = { sending: 'Sending', done: 'Done', failed: 'Failed' } as const

/**
 * The grid console's transaction toast, bottom right (full width on a
 * phone). Sending has no dismiss; Done closes itself after 6 s (the bar's
 * animation, paused on hover or focus); Failed stays until dismissed and
 * folds a raw error under Show details.
 *
 * The host is the one live region, there before any toast so the first is
 * announced: polite, and assertive for Failed. A nested alert would make
 * some screen readers read a failure twice.
 *
 * Render it outside `.gc`: the console is a CSS container, so a fixed toast
 * inside it would be placed against the console rather than the screen.
 * `id` changes with every toast and restarts the countdown.
 */
const ToastView = ({
  toast,
  onDismiss,
}: {
  toast: (ToastData & { id: number }) | null
  onDismiss: () => void
}) => {
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
    <div
      className="gc-toast-host"
      role="status"
      aria-live={toast?.kind === 'failed' ? 'assertive' : 'polite'}
    >
      {toast && (
        <div className={`gc-toast ${toast.kind}`}>
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
                <span>1 transaction · {toast.digest}</span>
                <a
                  className="lk"
                  href={toast.href}
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
              onClick={onDismiss}
            >
              <CloseIcon />
            </button>
          )}
          {toast.kind === 'done' && (
            <span
              key={toast.id}
              className="bar"
              aria-hidden="true"
              onAnimationEnd={onDismiss}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default ToastView
