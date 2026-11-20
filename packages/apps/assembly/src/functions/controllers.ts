import {
  createLogger,
  type EntityData,
  type SendSponsoredTransactionFn,
  type SponsoredTransactionActions,
  type SponsoredTransactionOutput,
} from '@evefrontier/dapp-kit'

import { toSponsoredAssembly } from './sponsoredAssembly'

const log = createLogger()

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

const sendControllerTransaction = async ({
  txAction,
  entity,
  characterId,
  sendSponsoredTransaction,
}: ControllerTransaction & {
  txAction: SponsoredTransactionActions
}): Promise<SponsoredTransactionOutput> => {
  log.info(`${txAction}: sending sponsored transaction`, { characterId })
  try {
    const result = await sendSponsoredTransaction({
      txAction,
      assembly: toSponsoredAssembly(entity),
      // TODO(wallet-core): SponsoredTransactionMetadata has no characterId yet
      metadata: { characterId } as never,
    })

    log.info('sponsored transaction result', result)

    return result
  } catch (error) {
    log.error('sponsored transaction error', error)

    throw error
  }
}

/** ADD ASSEMBLY CONTROLLER SPONSORED TRANSACTION FUNCTION */
export const addController = (
  args: ControllerTransaction,
): Promise<SponsoredTransactionOutput> =>
  sendControllerTransaction({ txAction: ADD_ASSEMBLY_CONTROLLER, ...args })

/** REMOVE ASSEMBLY CONTROLLER SPONSORED TRANSACTION FUNCTION */
export const removeController = (
  args: ControllerTransaction,
): Promise<SponsoredTransactionOutput> =>
  sendControllerTransaction({ txAction: REMOVE_ASSEMBLY_CONTROLLER, ...args })
