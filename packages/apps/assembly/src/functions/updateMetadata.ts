import {
  type EntityData,
  type SendSponsoredTransactionFn,
  SponsoredTransactionActions,
  type SponsoredTransactionOutput,
} from '@evefrontier/dapp-kit'

import { sendEntityAction } from './sponsoredAssembly'

/** The Assembly's details, as `metadata::edit` takes them. */
export interface AssemblyDetails {
  name: string
  description: string
  url: string
}

/**
 * UPDATE METADATA SPONSORED TRANSACTION FUNCTION
 *
 * Saves the Assembly's name, description and dapp URL: `metadata::edit`,
 * which always sets all three.
 */
export const updateMetadata = ({
  entity,
  details,
  sendSponsoredTransaction,
}: {
  entity: EntityData
  details: AssemblyDetails
  sendSponsoredTransaction: SendSponsoredTransactionFn
}): Promise<SponsoredTransactionOutput> =>
  sendEntityAction({
    txAction: SponsoredTransactionActions.UPDATE_METADATA,
    entity,
    metadata: { ...details },
    sendSponsoredTransaction,
  })
