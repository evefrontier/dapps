import type React from 'react'
import { useEffect, useRef } from 'react'

/** The three details the form edits. */
export interface DetailsFields {
  name: string
  description: string
  url: string
}

/**
 * Edit details: name, description and dapp URL, controlled by the caller,
 * which validates and saves. The name is focused and selected on open;
 * Escape cancels. While `pending`, the fields, Cancel and Escape are locked,
 * so a failed save keeps the draft.
 */
const DetailsFormView = ({
  draft,
  nameMax,
  descriptionMax,
  urlError,
  notice,
  pending,
  canSave,
  onChange,
  onSave,
  onCancel,
}: {
  draft: DetailsFields
  nameMax: number
  descriptionMax: number
  urlError: string | null
  /** A warning above the actions, e.g. that the details changed meanwhile. */
  notice?: string | null
  /** True while the save is being sent. */
  pending?: boolean
  /** False while nothing changed or the Assembly is locked. */
  canSave: boolean
  onChange: (field: keyof DetailsFields, value: string) => void
  onSave: () => void
  onCancel: () => void
}) => {
  const nameInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameInput.current?.focus()
    nameInput.current?.select()
  }, [])

  const set =
    (field: keyof DetailsFields) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(field, event.target.value)

  return (
    <form
      className="edit"
      onSubmit={(event) => {
        event.preventDefault()
        if (canSave) onSave()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !pending) onCancel()
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
          maxLength={nameMax}
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
          maxLength={descriptionMax}
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
      {notice && (
        <p className="err" role="status">
          {notice}
        </p>
      )}
      <div className="edit-acts">
        <button type="submit" className="gbtn" disabled={!canSave}>
          Save · 1 transaction
        </button>
        <button
          type="button"
          className="gbtn plain"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default DetailsFormView
