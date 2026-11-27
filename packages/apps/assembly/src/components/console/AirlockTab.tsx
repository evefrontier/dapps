import { type EntityData, useTypeNames } from '@evefrontier/dapp-kit'
import { AirlockView } from '@eveworld/ui-components'
import { useMemo } from 'react'

import { buildAirlocks } from './model'
import { airlockCards } from './viewProps'

/**
 * One card per airlock (inventory component): its section, how full it is,
 * and what it holds, the same for every role.
 */
const AirlockTab = ({ entity }: { entity: EntityData }) => {
  const airlocks = useMemo(() => buildAirlocks(entity), [entity])
  const typeIds = useMemo(
    () =>
      airlocks.flatMap((airlock) => [
        airlock.typeId,
        ...airlock.inventory.items.map((item) => item.typeId),
      ]),
    [airlocks],
  )
  const names = useTypeNames(typeIds)

  return <AirlockView airlocks={airlockCards(airlocks, names)} />
}

export default AirlockTab
