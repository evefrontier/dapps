import { useEffect, useState } from 'react'

/**
 * The current time, refreshed every `intervalMs`. Fuel only settles on chain
 * when a transaction touches the grid, so the console projects the burn
 * forward from the last settle and needs a clock to do it.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
