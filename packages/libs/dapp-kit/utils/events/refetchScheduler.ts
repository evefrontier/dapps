/**
 * Delays before each refetch after an event: the first, then the confirmations
 * that let the indexer behind the query endpoint catch up.
 */
export const EVENT_REFETCH_DELAYS_MS = [250, 1500, 3500] as const

/**
 * A refetch scheduled after an event. Calling it again never postpones a
 * pending first refetch; it re-arms only the confirmations. `cancel` drops all.
 */
export type ScheduledRefetch = (() => void) & { cancel: () => void }

/**
 * Refetch a few times after an event: the event can arrive before the query
 * endpoint's indexer has the transaction, so one immediate refetch could still
 * read the old version.
 *
 * The first refetch is bounded: it runs `delaysMs[0]` after the event that
 * scheduled it, and later events while it is pending leave it alone, so a
 * steady stream of events still refetches about every `delaysMs[0]`. The
 * confirmations (`delaysMs[1…]`) follow the latest event: each event cancels
 * and re-arms them, so they run once a burst has ended.
 *
 * @param refetch - The refetch to run
 * @param delaysMs - The first refetch's delay, then each confirmation's, in ms
 * @param onError - Called when a refetch rejects
 * @category Utilities - Events
 */
export function createEventRefetchScheduler(
  refetch: () => Promise<void>,
  delaysMs: readonly number[] = EVENT_REFETCH_DELAYS_MS,
  onError?: (error: unknown) => void,
): ScheduledRefetch {
  const [firstDelayMs, ...confirmDelaysMs] = delaysMs
  let first: ReturnType<typeof setTimeout> | null = null
  let confirms: ReturnType<typeof setTimeout>[] = []

  const run = () => {
    refetch().catch((error) => onError?.(error))
  }

  const cancelConfirms = () => {
    for (const timeout of confirms) clearTimeout(timeout)
    confirms = []
  }

  const scheduledRefetch = () => {
    if (first === null && firstDelayMs !== undefined) {
      first = setTimeout(() => {
        first = null
        run()
      }, firstDelayMs)
    }

    cancelConfirms()
    confirms = confirmDelaysMs.map((delayMs) => {
      const timeoutId = setTimeout(() => {
        confirms = confirms.filter((timeout) => timeout !== timeoutId)
        run()
      }, delayMs)
      return timeoutId
    })
  }

  scheduledRefetch.cancel = () => {
    if (first !== null) clearTimeout(first)
    first = null
    cancelConfirms()
  }

  return scheduledRefetch
}
