import type { EntityData } from '@evefrontier/dapp-kit'
import { HoldButton, Lever, Plate } from '@eveworld/ui-components'
import { useState } from 'react'

import { setGridPower } from '../../functions/setGridPower'
import { useSponsoredAction } from './useSponsoredAction'

/**
 * The main breaker. The shell and controllers get a lever: switching on is a
 * single click; cutting power takes every module offline, so it asks for the
 * hold button first. Visitors get a lamp plate. Module breakers keep their
 * settings either way, so switching back on restores exactly what was on.
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
  const [confirming, setConfirming] = useState(false)

  const locked = pending || entity.inFlight

  const send = (next: boolean) => {
    setConfirming(false)
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

  if (writable && confirming) {
    return (
      <div className="hold-box">
        <p>
          Cut power to the whole Assembly? Every module goes offline at once.
          Each breaker keeps its setting, so switching the main breaker back on
          brings them back.
        </p>
        <div className="hold-acts">
          <HoldButton
            label="Hold to cut power"
            sub="Main breaker · 1 transaction"
            disabled={locked}
            onComplete={() => send(false)}
          />
          <button
            type="button"
            className="gbtn plain"
            onClick={() => setConfirming(false)}
          >
            Keep it on
          </button>
        </div>
      </div>
    )
  }

  const text = on
    ? writable
      ? 'Emergency shut-off. Takes every module offline at once; each breaker keeps its setting.'
      : 'The grid is switched on.'
    : writable
      ? 'Nothing runs. Switch it on to bring back exactly what was switched on.'
      : 'The grid is switched off. Every module is offline.'

  return (
    <section className={`mb ${on ? 'on' : 'off'}`}>
      {writable ? (
        <Lever
          on={on}
          label="Main breaker"
          disabled={locked}
          onClick={() => (on ? setConfirming(true) : send(true))}
        />
      ) : (
        <Plate on={on} />
      )}
      <div className="mb-r">
        <span className="eyebrow">Main breaker</span>
        <b>{on ? 'On' : 'Off'}</b>
        <p>{text}</p>
      </div>
    </section>
  )
}

export default MainBreaker
