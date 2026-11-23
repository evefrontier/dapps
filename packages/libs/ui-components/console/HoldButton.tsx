import { useEffect, useRef, useState } from 'react'

const HOLD_MS = 1100

/**
 * The Graviton hold button: press and hold (pointer, Space or Enter) for
 * about a second to confirm. Releasing early cancels. The fill is the `--p`
 * custom property, 0 to 1.
 */
const HoldButton = ({
  label,
  sub,
  disabled,
  onComplete,
}: {
  label: string
  sub: string
  disabled?: boolean
  onComplete: () => void
}) => {
  const button = useRef<HTMLButtonElement>(null)
  const frame = useRef<number | null>(null)
  const startedAt = useRef(0)
  const [holding, setHolding] = useState(false)

  const setProgress = (p: number) =>
    button.current?.style.setProperty('--p', String(p))

  const stop = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    setHolding(false)
    setProgress(0)
  }

  const step = (now: number) => {
    const p = Math.min(1, (now - startedAt.current) / HOLD_MS)
    setProgress(p)
    if (p >= 1) {
      frame.current = null
      setHolding(false)
      onComplete()
      return
    }
    frame.current = requestAnimationFrame(step)
  }

  const start = () => {
    if (disabled || frame.current !== null) return
    setHolding(true)
    startedAt.current = performance.now()
    frame.current = requestAnimationFrame(step)
  }

  // Cancel a hold in progress when the button is disabled
  useEffect(() => {
    if (disabled) stop()
  }, [disabled])

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    [],
  )

  return (
    <button
      ref={button}
      type="button"
      className={`hold${holding ? ' on' : ''}`}
      disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault()
        start()
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(event) => {
        if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
          event.preventDefault()
          start()
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') stop()
      }}
      // Focus moving away mid-hold means the keyup never arrives
      onBlur={stop}
    >
      <span className="hold-l">{label}</span>
      <span className="hold-s">{sub}</span>
    </button>
  )
}

export default HoldButton
