import { Fragment, type ReactNode } from 'react'

import { EditIcon } from './primitives'

/** A lamp state: running, waiting, cut at the main breaker, or off. */
export type LampState = 'on' | 'wait' | 'main' | 'off'

/** One row of the identity panel's key-value list; `href` makes it a link. */
export interface IdentityRow {
  label: string
  value: string
  href?: string
}

/**
 * The Assembly at a glance, beside every tab: code, name, state lamp,
 * description and a key-value list. With `canEdit`, an edit icon calls
 * `onEdit`; while `editor` is given it replaces the name, description and
 * list (the lamp stays).
 */
const IdentityView = ({
  code,
  name,
  lamp,
  description,
  rows,
  canEdit,
  editDisabled,
  onEdit,
  editor,
}: {
  code: string
  /** Null for an unnamed Assembly. */
  name: string | null
  lamp: { state: LampState; label: string; detail?: string[] }
  description?: string
  rows: IdentityRow[]
  canEdit: boolean
  editDisabled?: boolean
  onEdit?: () => void
  editor?: ReactNode
}) => {
  const stateBig = (
    <div className="state-big" data-state={lamp.state}>
      <span className="led" />
      <b>{lamp.label}</b>
      {lamp.detail && (
        <span>
          {lamp.detail.map((line, index) => (
            <Fragment key={line}>
              {index > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </span>
      )}
    </div>
  )

  if (editor) {
    return (
      <aside className="ident">
        <div className="id-head">
          <div className="code">{code}</div>
          {editor}
        </div>
        {stateBig}
      </aside>
    )
  }

  return (
    <aside className="ident">
      <div className="id-head">
        <div className="code">{code}</div>
        <div className="name-row">
          {name ? (
            <h2>{name}</h2>
          ) : (
            <h2 className="unnamed">Unnamed Assembly</h2>
          )}
          {canEdit && (
            <button
              type="button"
              className="icon-btn"
              aria-label="Edit name, description and URL"
              title="Edit details"
              disabled={editDisabled}
              onClick={onEdit}
            >
              <EditIcon />
            </button>
          )}
        </div>
      </div>

      {stateBig}

      {description && <p className="desc">{description}</p>}

      <dl className="kv">
        {rows.map((row) => (
          <IdentityRowItem key={row.label} row={row} />
        ))}
      </dl>
    </aside>
  )
}

const IdentityRowItem = ({ row }: { row: IdentityRow }) => (
  <>
    <dt>{row.label}</dt>
    <dd>
      {row.href ? (
        <a
          className="lnk"
          href={row.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {row.value}
        </a>
      ) : (
        row.value
      )}
    </dd>
  </>
)

export default IdentityView
