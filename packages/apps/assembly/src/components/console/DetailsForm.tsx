import type { EntityData, EntityMetadata } from '@evefrontier/dapp-kit'
import React, { useEffect, useRef, useState } from 'react'

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
  const nameInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInput.current?.focus()
    nameInput.current?.select()
  }, [])

  const locked = pending || entity.inFlight
  const changed = detailsChanged(draft, metadata)

  const set =
    (field: keyof DetailsDraft) =>
    (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ): void => {
      setDraft((current) => ({ ...current, [field]: event.target.value }))
      if (field === 'url') setUrlError(null)
    }

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault()
    if (locked || !changed) return
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
    <form
      className="edit"
      onSubmit={handleSave}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !pending) onClose()
      }}
      noValidate
    >
      <div className="eyebrow">Edit details</div>
      <label htmlFor="ed-name">
        <span className="ed-l">Name</span>
        <input
          id="ed-name"
          ref={nameInput}
          value={draft.name}
          maxLength={NAME_MAX}
          autoComplete="off"
          disabled={pending}
          onChange={set('name')}
        />
      </label>
      <label htmlFor="ed-desc">
        <span className="ed-l">Description</span>
        <textarea
          id="ed-desc"
          rows={3}
          value={draft.description}
          maxLength={DESCRIPTION_MAX}
          disabled={pending}
          onChange={set('description')}
        />
      </label>
      <label htmlFor="ed-url">
        <span className="ed-l">Dapp URL</span>
        <input
          id="ed-url"
          type="url"
          value={draft.url}
          placeholder="https://…"
          autoComplete="off"
          spellCheck={false}
          disabled={pending}
          aria-invalid={!!urlError}
          aria-describedby={urlError ? 'ed-url-error' : undefined}
          onChange={set('url')}
        />
      </label>
      {urlError && (
        <p className="err" id="ed-url-error">
          {urlError}
        </p>
      )}
      {conflict && (
        <p className="err" role="status">
          The details were saved elsewhere since you opened this. Saving
          replaces them with what you see here.
        </p>
      )}
      <div className="edit-acts">
        <button type="submit" className="gbtn" disabled={locked || !changed}>
          Save · 1 transaction
        </button>
        <button
          type="button"
          className="gbtn plain"
          disabled={pending}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default DetailsForm
