import { useEffect, useRef } from 'react'

/** One row of the Controllers list. Without `onRemove`, no Remove button. */
export interface ControllerRowData {
  key: string
  name: string
  isShell: boolean
  isYou: boolean
  /** The wallet, shortened; `addressTitle` is the full one. */
  address: string
  addressTitle?: string
  onRemove?: () => void
}

/** A character found by name; `tag` marks one already on the list. */
export interface CandidateData {
  id: string
  name: string
  code: string
  wallet: string
  tag?: 'Shell' | 'Controller'
  onPick: () => void
}

/** The add form, controlled by the caller. */
export interface AddControllerForm {
  open: boolean
  onOpen: () => void
  onClose: () => void
  /** Name search is on: the label and placeholder mention names. */
  searchOn: boolean
  value: string
  onChange: (value: string) => void
  error: string | null
  /** The search result picked, shown under the field. */
  picked: { name: string; code: string } | null
  /** Search results under the field, or null to show none. */
  search: {
    status: 'loading' | 'error' | 'ready'
    candidates: CandidateData[]
  } | null
  directoryError: boolean
  canSubmit: boolean
  onSubmit: () => void
}

/**
 * The Access tab: the Controllers list in on-chain order, tagged Shell and
 * You, with Remove where the caller allows it, and the add form. The caller
 * resolves and sends; this only draws and focuses the field.
 */
const AccessView = ({
  rows,
  loading,
  locked,
  add,
}: {
  rows: ControllerRowData[]
  loading: boolean
  /** True while a transaction is being sent or is in flight. */
  locked: boolean
  add: AddControllerForm
}) => {
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (add.open) input.current?.focus()
  }, [add.open])

  return (
    <div className="acc" id="SmartObject-Controllers">
      <div className="stack">
        <div className="bar-h">
          Controllers<span>{rows.length}</span>
        </div>

        {rows.length === 0 ? (
          <p className="none-note">
            {loading ? 'Loading controllers…' : 'No controllers.'}
          </p>
        ) : (
          <div className="plist">
            {rows.map((row) => (
              <div key={row.key} className="person">
                <span className="pn">
                  <b>{row.name}</b>
                  {row.isShell && <span className="tag on">Shell</span>}
                  {row.isYou && <span className="tag pend">You</span>}
                </span>
                <span className="pm" title={row.addressTitle}>
                  {row.address}
                </span>
                {row.onRemove && (
                  <span className="act">
                    <button
                      type="button"
                      className="rm"
                      disabled={locked}
                      onClick={row.onRemove}
                    >
                      Remove
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="add">
          {add.open ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                add.onSubmit()
              }}
              noValidate
            >
              <label htmlFor="add-wallet">
                {add.searchOn
                  ? 'Wallet address or character name'
                  : 'Wallet address'}
                <input
                  id="add-wallet"
                  ref={input}
                  value={add.value}
                  placeholder={add.searchOn ? '0x… or a name' : '0x…'}
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={!!add.error}
                  aria-describedby={add.error ? 'add-wallet-error' : undefined}
                  onChange={(event) => add.onChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') add.onClose()
                  }}
                />
              </label>
              {add.picked && (
                <p className="picked">
                  Adding <b>{add.picked.name}</b> {add.picked.code}
                </p>
              )}
              {add.search &&
                (add.search.status === 'loading' ? (
                  <p className="none-note">Loading characters…</p>
                ) : add.search.status === 'error' ? (
                  <p className="err">Could not load characters.</p>
                ) : add.search.candidates.length === 0 ? (
                  <p className="none-note">No matching characters</p>
                ) : (
                  <ul className="cands" aria-label="Matching characters">
                    {add.search.candidates.map((candidate) => (
                      <li key={candidate.id}>
                        <button
                          type="button"
                          className="cand"
                          disabled={!!candidate.tag}
                          onClick={() => {
                            candidate.onPick()
                            input.current?.focus()
                          }}
                        >
                          <span className="cn">
                            {candidate.name}
                            <i>{candidate.code}</i>
                          </span>
                          {candidate.tag && (
                            <span
                              className={`tag${candidate.tag === 'Shell' ? ' on' : ''}`}
                            >
                              {candidate.tag}
                            </span>
                          )}
                          <span className="cm">{candidate.wallet}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ))}
              {add.directoryError && (
                <p className="err">Could not load characters.</p>
              )}
              {add.error && (
                <p className="err" id="add-wallet-error">
                  {add.error}
                </p>
              )}
              <div className="add-acts">
                <button
                  type="submit"
                  className="gbtn"
                  disabled={!add.canSubmit}
                >
                  Add · 1 transaction
                </button>
                <button
                  type="button"
                  className="gbtn plain"
                  onClick={add.onClose}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="add-open"
              disabled={locked}
              onClick={add.onOpen}
            >
              + Add controller
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default AccessView
