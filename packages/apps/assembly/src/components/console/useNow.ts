import { useEffect, useState } from 'react'

const TICK_MS = 30_000

/**
 * The current time, refreshed every 30 seconds. Fuel only settles on chain
 * when a transaction touches the grid, so the console projects the burn
 * forward from the last settle and needs a clock to do it.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [])
  return now
}
