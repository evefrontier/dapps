import { DappView } from '@eveworld/ui-components'

import { dappSource } from './dappSource'
import { hostOf } from './format'

/**
 * The Assembly's attached dapp, loaded with its item id and tenant. Only an
 * https address is shown; with no URL (`assembly-show-dapp`), a placeholder.
 */
const DappTab = ({
  url,
  itemId,
  tenant,
}: {
  url: string
  itemId: string
  tenant: string
}) => (
  <DappView
    host={url ? hostOf(url) : null}
    src={dappSource(url, itemId, tenant)}
  />
)

export default DappTab
