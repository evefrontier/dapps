import {
  createLogger,
  type EntityData,
  type SendSponsoredTransactionFn,
  type SponsoredTransactionActions,
  type SponsoredTransactionOutput,
} from '@evefrontier/dapp-kit'

import { toSponsoredAssembly } from './sponsoredAssembly'

const log = createLogger()

// TODO(wallet-core): replace with a SponsoredTransactionActions value once
// wallet-core and the sponsor backend support power_grid::set_power_grid.
// Until then the wallet rejects this action.
const SET_POWER_GRID =
  'set-power-grid' as unknown as SponsoredTransactionActions

/**
 * SET POWER GRID SPONSORED TRANSACTION FUNCTION
 *
 * Switches the main breaker: `power_grid::set_power_grid`, which needs
 * `power_grid::OperateGrid`. Module breakers keep their settings, so switching
 * back on brings back exactly what was on.
 */
export const setGridPower = async ({
  entity,
  on,
  sendSponsoredTransaction,
}: {
  entity: EntityData
  on: boolean
  sendSponsoredTransaction: SendSponsoredTransactionFn
}): Promise<SponsoredTransactionOutput> => {
  log.info(`${SET_POWER_GRID}: sending sponsored transaction`, { on })
  try {
    const result = await sendSponsoredTransaction({
      txAction: SET_POWER_GRID,
      assembly: toSponsoredAssembly(entity),
      // TODO(wallet-core): SponsoredTransactionMetadata has no `on` yet
      metadata: { on } as never,
    })
    log.info('sponsored transaction result', result)
    return result
  } catch (error) {
    log.error('sponsored transaction error', error)
    throw error
  }
}
