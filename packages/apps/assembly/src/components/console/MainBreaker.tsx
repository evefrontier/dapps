import {
  type EntityData,
  Severity,
  useNotification,
  useSmartObject,
  useSponsoredTransaction,
} from '@evefrontier/dapp-kit'
import { useState } from 'react'

import { setGridPower } from '../../functions/setGridPower'
import HoldButton from './HoldButton'

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
  const { refetch } = useSmartObject()
  const { notify } = useNotification()
  const { mutateAsync: sendSponsoredTransaction } = useSponsoredTransaction()
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)

  const locked = pending || entity.inFlight

  const send = async (next: boolean) => {
    setConfirming(false)
    setPending(true)
    try {
      const result = await setGridPower({
        entity,
        on: next,
        sendSponsoredTransaction,
      })
      if (result?.digest) {
        notify({
          type: Severity.Success,
          txHash: result.digest,
          onSuccess: async () => {
            await refetch()
          },
        })
      }
    } catch (error) {
      notify({
        type: Severity.Error,
        message: `Failed to switch the main breaker ${next ? 'on' : 'off'}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      })
    } finally {
      setPending(false)
    }
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
        <button
          type="button"
          className="lever"
          role="switch"
          aria-checked={on}
          aria-label="Main breaker"
          disabled={locked}
          onClick={() => (on ? setConfirming(true) : send(true))}
        >
          <span className="h" />
        </button>
      ) : (
        <div className={`plate ${on ? '' : 'off'}`} aria-hidden="true">
          <span className={`led ${on ? 'on' : ''}`} />
          <i>{on ? 'ON' : 'OFF'}</i>
        </div>
      )}
      <div className="mb-r">
        <span className="eyebrow">Main breaker</span>
        <b>
          {on ? 'On' : 'Off'}
          {pending && ' · sending'}
        </b>
        <p>{text}</p>
      </div>
    </section>
  )
}

export default MainBreaker
