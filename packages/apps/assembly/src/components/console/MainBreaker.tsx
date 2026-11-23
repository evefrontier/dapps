import type { EntityData } from '@evefrontier/dapp-kit'
import { MainBreakerView } from '@eveworld/ui-components'

import { setGridPower } from '../../functions/setGridPower'
import { useSponsoredAction } from './useSponsoredAction'

/**
 * The main breaker: sends `set-power-grid` when a writer flips the lever.
 * Module breakers keep their settings either way, so switching back on
 * restores exactly what was on.
 */
const MainBreaker = ({
  entity,
  on,
  writable,
}: {
  entity: EntityData
  on: boolean
  writable: boolean
}) => {
  const { run, pending } = useSponsoredAction()

  const send = (next: boolean) => {
    const word = next ? 'on' : 'off'
    run(
      {
        sending: `Switching the main breaker ${word}`,
        done: `Main breaker switched ${word}`,
        failed: `Couldn't switch the main breaker ${word}`,
      },
      (sendSponsoredTransaction) =>
        setGridPower({ entity, on: next, sendSponsoredTransaction }),
    )
  }

  return (
    <MainBreakerView
      on={on}
      writable={writable}
      locked={pending || entity.inFlight}
      onSwitch={send}
    />
  )
}

export default MainBreaker
