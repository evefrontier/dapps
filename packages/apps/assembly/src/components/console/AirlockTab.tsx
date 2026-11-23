import { type EntityData, useTypeNames } from '@evefrontier/dapp-kit'
import { AirlockView } from '@eveworld/ui-components'
import { useMemo } from 'react'

import { buildAirlocks } from './model'
import { airlockCards } from './viewProps'

/**
 * One card per airlock (inventory component): its section, how full it is,
 * and, for the shell and controllers, what it holds. The contents are public
 * on chain; leaving them off the visitor's screen is a display choice, not
 * privacy.
 */
const AirlockTab = ({
  entity,
  showContents,
}: {
  entity: EntityData
  showContents: boolean
}) => {
  const airlocks = useMemo(() => buildAirlocks(entity), [entity])
  const typeIds = useMemo(
    () =>
      airlocks.flatMap((airlock) => [
        airlock.typeId,
        ...(showContents
          ? airlock.inventory.items.map((item) => item.typeId)
          : []),
      ]),
    [airlocks, showContents],
  )
  const names = useTypeNames(typeIds)

  return <AirlockView airlocks={airlockCards(airlocks, names, showContents)} />
}

export default AirlockTab
