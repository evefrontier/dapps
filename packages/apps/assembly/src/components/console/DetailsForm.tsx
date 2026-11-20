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
} from './details'
import { useSponsoredAction } from './useSponsoredAction'

/**
 * Edit details: the Assembly's name, description and dapp URL, saved
 * together in one transaction (`metadata::edit` always sets all three).
 * Clearing the URL removes the Dapp tab.
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
  const [urlError, setUrlError] = useState<string | null>(null)
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
      'save the details',
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
        if (event.key === 'Escape') onClose()
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
      <div className="edit-acts">
        <button type="submit" className="gbtn" disabled={locked || !changed}>
          Save · 1 transaction
        </button>
        <button type="button" className="gbtn plain" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  )
}

export default DetailsForm
