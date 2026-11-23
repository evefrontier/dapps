import { useEffect, useState } from 'react'

import HoldButton from './HoldButton'
import { Lever, Plate } from './primitives'

/**
 * The main breaker. Writers get a lever: switching on is a single click;
 * cutting power takes every module offline, so it asks for the hold button
 * first. Read-only viewers get a lamp plate.
 */
const MainBreakerView = ({
  on,
  writable,
  locked,
  onSwitch,
}: {
  on: boolean
  writable: boolean
  /** True while a transaction is being sent or is in flight. */
  locked: boolean
  onSwitch: (next: boolean) => void
}) => {
  const [confirming, setConfirming] = useState(false)

  const send = (next: boolean) => {
    setConfirming(false)
    onSwitch(next)
  }

  // A refetch can show it already off with the hold open: drop the hold
  useEffect(() => {
    if (!on) setConfirming(false)
  }, [on])

  if (writable && confirming && on) {
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

export default MainBreakerView
