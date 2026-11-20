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

/**
 * The sponsored transaction input still takes the old assembly shape; only
 * `item_id` and `type` are read from it.
 * TODO(wallet-core): pass the entity once sponsored transactions accept one.
 */
const toSponsoredAssembly = (entity: EntityData): AssemblyType<Assemblies> =>
  ({
    item_id: entity.key.id,
    type: Assemblies.Assembly,
  }) as unknown as AssemblyType<Assemblies>

/**
 * Sends one sponsored action on an entity, logging the attempt and its
 * result, and rethrowing a failure for the caller to report.
 *
 * @param txAction - The sponsored action
 * @param entity - The entity it acts on
 * @param metadata - The action's inputs
 */
export const sendEntityAction = async ({
  txAction,
  entity,
  metadata,
  sendSponsoredTransaction,
}: {
  txAction: SponsoredTransactionActions
  entity: EntityData
  metadata: Record<string, unknown>
  sendSponsoredTransaction: SendSponsoredTransactionFn
}): Promise<SponsoredTransactionOutput> => {
  log.info(`${txAction}: sending sponsored transaction`, metadata)
  try {
    const result = await sendSponsoredTransaction({
      txAction,
      assembly: toSponsoredAssembly(entity),
      // TODO(wallet-core): SponsoredTransactionMetadata has none of these
      // actions' inputs yet
      metadata: metadata as never,
    })
    log.info('sponsored transaction result', result)
    return result
  } catch (error) {
    log.error('sponsored transaction error', error)
    throw error
  }
}
