import {
  Assemblies,
  type AssemblyType,
  createLogger,
  type EntityData,
  type SendSponsoredTransactionFn,
  type SponsoredTransactionActions,
  type SponsoredTransactionOutput,
} from '@evefrontier/dapp-kit'

const log = createLogger()

// TODO(wallet-core): replace with SponsoredTransactionActions values once
// wallet-core and the sponsor backend support assembly controllers.
const ADD_ASSEMBLY_CONTROLLER =
  'add-assembly-controller' as unknown as SponsoredTransactionActions
const REMOVE_ASSEMBLY_CONTROLLER =
  'remove-assembly-controller' as unknown as SponsoredTransactionActions

/**
 * The sponsored transaction input still takes the old assembly shape; only
 * `item_id` and `type` are read from it.
 * TODO(wallet-core): pass the entity once sponsored transactions accept one.
 */
const toSponsoredAssembly = (entity: EntityData) =>
  ({
    item_id: entity.key.id,
    type: Assemblies.Assembly,
  }) as unknown as AssemblyType<Assemblies>

const sendControllerTransaction = async ({
  txAction,
  entity,
  characterId,
  sendSponsoredTransaction,
}: {
  txAction: SponsoredTransactionActions
  entity: EntityData
  characterId: string
  sendSponsoredTransaction: SendSponsoredTransactionFn
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
export const addController = (args: {
  entity: EntityData
  characterId: string
  sendSponsoredTransaction: SendSponsoredTransactionFn
}): Promise<SponsoredTransactionOutput> =>
  sendControllerTransaction({ txAction: ADD_ASSEMBLY_CONTROLLER, ...args })

/** REMOVE ASSEMBLY CONTROLLER SPONSORED TRANSACTION FUNCTION */
export const removeController = (args: {
  entity: EntityData
  characterId: string
  sendSponsoredTransaction: SendSponsoredTransactionFn
}): Promise<SponsoredTransactionOutput> =>
  sendControllerTransaction({ txAction: REMOVE_ASSEMBLY_CONTROLLER, ...args })
