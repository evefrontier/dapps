import { type EntityData, useTypeNames } from '@evefrontier/dapp-kit'
import { useMemo } from 'react'

import { count, units } from './format'
import { buildAirlocks } from './model'

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

  return (
    <div className="secs">
      {airlocks.map(({ componentId, code, typeId, sectionName, inventory }) => {
        const capacity = Number(inventory.capacity)
        const pct = capacity > 0 ? Number(inventory.used) / capacity : 0
        return (
          <div key={componentId} className="sec">
            <div className="sec-h">
              <b>{names[typeId] || inventory.name || 'Airlock'}</b>
              <span>
                {code}
                {sectionName && ` · ${sectionName}`}
              </span>
            </div>
            <div className="inv-r">
              <span>Used</span>
              <b>
                {units(inventory.used)} / {units(inventory.capacity)} m³
              </b>
              <div className="meter">
                <i
                  style={{ width: `${Math.min(100, pct * 100).toFixed(1)}%` }}
                />
              </div>
            </div>
            {showContents &&
              (inventory.items.length ? (
                <ul className="inv-items">
                  {inventory.items.map((item) => (
                    <li key={item.typeId}>
                      <span className="itm-ic" aria-hidden="true" />
                      <span className="in">
                        {names[item.typeId] || `Type ${item.typeId}`}
                      </span>
                      <span className="iq">×{count(item.quantity)}</span>
                      <span className="iv">
                        {units(BigInt(item.quantity) * BigInt(item.volume))} m³
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="none-note">Empty</p>
              ))}
          </div>
        )
      })}
    </div>
  )
}

export default AirlockTab
