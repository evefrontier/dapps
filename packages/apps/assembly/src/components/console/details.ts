import type { EntityMetadata } from '@evefrontier/dapp-kit'

import type { AssemblyDetails } from '../../functions/updateMetadata'
import { httpsUrl } from './dappSource'

/** What the details form holds while it is being edited. */
export type DetailsDraft = AssemblyDetails

export const NAME_MAX = 64
export const DESCRIPTION_MAX = 280

export const URL_ERROR = 'Use an https address, e.g. https://example.com'

/** Details for an Assembly with no Metadata component: all empty. */
export const NO_DETAILS: EntityMetadata = { name: '', description: '', url: '' }

/**
 * The details the viewer can edit, or null when there is nothing to edit.
 * Only the shell and controllers edit. An Assembly with no Metadata component
 * has nothing to edit, unless `withoutMetadata` (the
 * `assembly-edit-without-metadata` flag) opens the form from empty details;
 * saving then fails on chain, since `metadata::edit` needs the component.
 */
export function editableDetails(
  metadata: EntityMetadata | null,
  canEdit: boolean,
  withoutMetadata: boolean,
): EntityMetadata | null {
  if (!canEdit) return null
  return metadata ?? (withoutMetadata ? NO_DETAILS : null)
}

/** The form's starting values: the Assembly's current details. */
export function detailsDraft(metadata: EntityMetadata): DetailsDraft {
  return {
    name: metadata.name,
    description: metadata.description,
    url: metadata.url,
  }
}

const trimmed = (details: AssemblyDetails): AssemblyDetails => ({
  name: details.name.trim(),
  description: details.description.trim(),
  url: details.url.trim(),
})

/** True when the draft differs from the saved details, ignoring surrounding whitespace. */
export function detailsChanged(
  draft: DetailsDraft,
  metadata: EntityMetadata,
): boolean {
  const next = trimmed(draft)
  const saved = trimmed(metadata)
  return (
    next.name !== saved.name ||
    next.description !== saved.description ||
    next.url !== saved.url
  )
}

export type CheckedDetails =
  | { ok: true; details: AssemblyDetails }
  | { ok: false; error: string }

/**
 * The details to save, trimmed. An empty URL is allowed: it clears the dapp,
 * which removes the Dapp tab. Any other URL must be one the Dapp tab will
 * load (https); one typed without a scheme is saved as `https://…`, so what
 * is stored is what loads.
 */
export function checkDetails(draft: DetailsDraft): CheckedDetails {
  const details = trimmed(draft)
  if (!details.url) return { ok: true, details }
  if (!httpsUrl(details.url)) return { ok: false, error: URL_ERROR }
  const url = /^https:\/\//i.test(details.url)
    ? details.url
    : `https://${details.url}`
  return { ok: true, details: { ...details, url } }
}
