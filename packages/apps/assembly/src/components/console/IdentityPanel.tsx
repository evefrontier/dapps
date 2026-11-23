import {
  abbreviateAddress,
  canManage,
  type EntityData,
  type EntityOwner,
  type EntityRole,
  type GridSummary,
} from '@evefrontier/dapp-kit'
import { EditIcon } from '@eveworld/ui-components'
import { useState } from 'react'

import { useFlagVariant } from '../../flags'
import DetailsForm from './DetailsForm'
import { httpsUrl } from './dappSource'
import { editableDetails } from './details'
import { hostOf, mw } from './format'
import { gridLamp } from './model'
import { useControllerRows } from './useControllerRows'

/** The shell's character name, or its wallet when the character has none. */
const shellLabel = (owner: EntityOwner | null): string =>
  owner?.character?.metadata?.name ||
  abbreviateAddress(owner?.walletAddress ?? owner?.holder ?? '') ||
  'Unknown'

/**
 * The Assembly at a glance, on every tab: code, name, whether it is running,
 * description, shell, controller count and dapp link. The shell and
 * controllers edit the name, description and dapp URL from the edit icon; an
 * Assembly with no Metadata component has nothing to edit (see
 * {@link editableDetails}).
 */
const IdentityPanel = ({
  entity,
  entityOwner,
  role,
  summary,
}: {
  entity: EntityData
  entityOwner: EntityOwner | null
  role: EntityRole
  summary: GridSummary | null
}) => {
  const { rows } = useControllerRows(role !== 'visitor')
  // The entity being edited, so selecting another closes the form
  const [editingId, setEditingId] = useState<string | null>(null)
  const editing = editingId === entity.id
  const metadata = entity.metadata
  const state = gridLamp(summary)
  const url = metadata?.url?.trim()
  const dappUrl = url ? httpsUrl(url)?.href : undefined
  const editWithoutMetadata =
    useFlagVariant('assembly-edit-without-metadata') === 'on'
  const editable = editableDetails(
    metadata,
    canManage(role),
    editWithoutMetadata,
  )

  const stateBig = (
    <div className="state-big" data-state={state.lamp}>
      <span className="led" />
      <b>{state.label}</b>
      {summary && (
        <span>
          {summary.modulesOnline} of {summary.modulesTotal} online
          <br />
          {mw(summary.drawMw)} / {mw(summary.outputMw)} MW
        </span>
      )}
    </div>
  )

  if (editing && editable) {
    return (
      <aside className="ident">
        <div className="id-head">
          <div className="code">Assembly · {entity.key.id}</div>
          <DetailsForm
            key={entity.id}
            entity={entity}
            metadata={editable}
            onClose={() => setEditingId(null)}
          />
        </div>
        {stateBig}
      </aside>
    )
  }

  return (
    <aside className="ident">
      <div className="id-head">
        <div className="code">Assembly · {entity.key.id}</div>
        <div className="name-row">
          {metadata?.name ? (
            <h2>{metadata.name}</h2>
          ) : (
            <h2 className="unnamed">Unnamed Assembly</h2>
          )}
          {editable && (
            <button
              type="button"
              className="icon-btn"
              aria-label="Edit name, description and URL"
              title="Edit details"
              disabled={entity.inFlight}
              onClick={() => setEditingId(entity.id)}
            >
              <EditIcon />
            </button>
          )}
        </div>
      </div>

      {stateBig}

      {metadata?.description && <p className="desc">{metadata.description}</p>}

      <dl className="kv">
        <dt>Shell</dt>
        <dd>{shellLabel(entityOwner)}</dd>
        {role !== 'visitor' && (
          <>
            <dt>Controllers</dt>
            <dd>{rows.length}</dd>
          </>
        )}
        {dappUrl && (
          <>
            <dt>Dapp</dt>
            <dd>
              <a
                className="lnk"
                href={dappUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {hostOf(dappUrl)}
              </a>
            </dd>
          </>
        )}
      </dl>
    </aside>
  )
}

export default IdentityPanel
