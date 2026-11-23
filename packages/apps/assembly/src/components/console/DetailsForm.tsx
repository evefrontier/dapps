import type { EntityData, EntityMetadata } from '@evefrontier/dapp-kit'
import { DetailsFormView } from '@eveworld/ui-components'
import { useState } from 'react'

import { updateMetadata } from '../../functions/updateMetadata'
import {
  checkDetails,
  DESCRIPTION_MAX,
  type DetailsDraft,
  detailsChanged,
  detailsDraft,
  NAME_MAX,
  rebaseDraft,
} from './details'
import { useSponsoredAction } from './useSponsoredAction'

/**
 * Edit details: the Assembly's name, description and dapp URL, saved
 * together in one transaction (`metadata::edit` always sets all three).
 * Clearing the URL removes the Dapp tab. If the details are saved elsewhere
 * while the form is open, fields not yet edited take the new values, and a
 * notice warns when saving would overwrite one that was (see
 * {@link rebaseDraft}). The form is locked while it saves, so a failed save
 * keeps the draft.
 */
const DetailsForm = ({
  entity,
  metadata,
  onClose,
}: {
  entity: EntityData
  metadata: EntityMetadata
  onClose: () => void
}) => {
  const { run, pending } = useSponsoredAction()
  const [draft, setDraft] = useState<DetailsDraft>(() => detailsDraft(metadata))
  const [base, setBase] = useState(metadata)
  const [conflict, setConflict] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)

  // Saved elsewhere while open: rebase the draft on the new details. Not
  // while our own save is landing; the form closes once it has
  if (!pending && detailsChanged(base, metadata)) {
    const rebased = rebaseDraft(draft, base, metadata)
    setDraft(rebased.draft)
    setBase(metadata)
    setConflict((last) => last || rebased.conflict)
  }

  const locked = pending || entity.inFlight
  const changed = detailsChanged(draft, metadata)

  const save = () => {
    const result = checkDetails(draft)
    if (!result.ok) {
      setUrlError(result.error)
      return
    }
    run(
      {
        sending: 'Saving the details',
        done: 'Details saved',
        failed: "Couldn't save the details",
      },
      (sendSponsoredTransaction) =>
        updateMetadata({
          entity,
          details: result.details,
          sendSponsoredTransaction,
        }),
      onClose,
    )
  }

  return (
    <DetailsFormView
      draft={draft}
      nameMax={NAME_MAX}
      descriptionMax={DESCRIPTION_MAX}
      urlError={urlError}
      notice={
        conflict
          ? 'The details were saved elsewhere since you opened this. Saving replaces them with what you see here.'
          : null
      }
      pending={pending}
      canSave={!locked && changed}
      onChange={(field, value) => {
        setDraft((current) => ({ ...current, [field]: value }))
        if (field === 'url') setUrlError(null)
      }}
      onSave={save}
      onCancel={onClose}
    />
  )
}

export default DetailsForm
