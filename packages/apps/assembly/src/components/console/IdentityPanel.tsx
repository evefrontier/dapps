import {
  canManage,
  type EntityData,
  type EntityOwner,
  type EntityRole,
  type GridSummary,
} from '@evefrontier/dapp-kit'
import { IdentityView } from '@eveworld/ui-components'
import { useState } from 'react'

import { useFlagVariant } from '../../flags'
import DetailsForm from './DetailsForm'
import { editableDetails } from './details'
import { useControllerRows } from './useControllerRows'
import { identityViewProps } from './viewProps'

/**
 * The Assembly at a glance, on every tab. The shell and controllers edit the
 * name, description and dapp URL from the edit icon; an Assembly with no
 * Metadata component has nothing to edit (see {@link editableDetails}).
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
  const editWithoutMetadata =
    useFlagVariant('assembly-edit-without-metadata') === 'on'
  const editable = editableDetails(
    entity.metadata,
    canManage(role),
    editWithoutMetadata,
  )

  return (
    <IdentityView
      {...identityViewProps({
        entity,
        owner: entityOwner,
        summary,
        controllerCount: role === 'visitor' ? null : rows.length,
      })}
      canEdit={!!editable}
      editDisabled={entity.inFlight}
      onEdit={() => setEditingId(entity.id)}
      editor={
        editing && editable ? (
          <DetailsForm
            key={entity.id}
            entity={entity}
            metadata={editable}
            onClose={() => setEditingId(null)}
          />
        ) : undefined
      }
    />
  )
}

export default IdentityPanel
