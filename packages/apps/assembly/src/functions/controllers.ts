import type {
  EntityData,
  SendSponsoredTransactionFn,
  SponsoredTransactionActions,
  SponsoredTransactionOutput,
} from '@evefrontier/dapp-kit'

import { sendEntityAction } from './sponsoredAssembly'

// TODO(wallet-core): replace with SponsoredTransactionActions values once
// wallet-core and the sponsor backend support assembly controllers.
const ADD_ASSEMBLY_CONTROLLER =
  'add-assembly-controller' as unknown as SponsoredTransactionActions
const REMOVE_ASSEMBLY_CONTROLLER =
  'remove-assembly-controller' as unknown as SponsoredTransactionActions

/** What adding or removing a controller needs. */
export interface ControllerTransaction {
  entity: EntityData
  /** The character to add or remove */
  characterId: string
  sendSponsoredTransaction: SendSponsoredTransactionFn
}

/** ADD ASSEMBLY CONTROLLER SPONSORED TRANSACTION FUNCTION */
export const addController = ({
  characterId,
  ...rest
}: ControllerTransaction): Promise<SponsoredTransactionOutput> =>
  sendEntityAction({
    txAction: ADD_ASSEMBLY_CONTROLLER,
    metadata: { characterId },
    ...rest,
  })

/** REMOVE ASSEMBLY CONTROLLER SPONSORED TRANSACTION FUNCTION */
export const removeController = ({
  characterId,
  ...rest
}: ControllerTransaction): Promise<SponsoredTransactionOutput> =>
  sendEntityAction({
    txAction: REMOVE_ASSEMBLY_CONTROLLER,
    metadata: { characterId },
    ...rest,
  })
