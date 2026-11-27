import { useEffect, useState } from 'react'

const TICK_MS = 1_000

/**
 * The current time, refreshed every second. Fuel only settles on chain when a
 * transaction touches the grid, so the console projects the burn forward from
 * the last settle and needs a clock to do it; ticking every second keeps the
 * fuel left, the gauge and the time left counting down live, as the game does.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [])
  return now
}
