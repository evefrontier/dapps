/** Delays after an event before each confirming refetch, so the indexer behind the query endpoint can catch up. */
export const EVENT_REFETCH_DELAYS_MS = [250, 1500, 3500] as const

/** A refetch scheduled after an event; calling it again re-arms it, `cancel` drops it. */
export type ScheduledRefetch = (() => void) & { cancel: () => void }

/**
 * Refetch a few times after an event: the event can arrive before the query
 * endpoint's indexer has the transaction, so one immediate refetch could still
 * read the old version. Each new event cancels the pending refetches and
 * starts again.
 *
 * @param refetch - The refetch to run
 * @param delaysMs - When to run it, in ms after the latest event
 * @param onError - Called when a refetch rejects
 * @category Utilities - Events
 */
export function createEventRefetchScheduler(
  refetch: () => Promise<void>,
  delaysMs: readonly number[] = EVENT_REFETCH_DELAYS_MS,
  onError?: (error: unknown) => void,
): ScheduledRefetch {
  let timeouts: ReturnType<typeof setTimeout>[] = []

  const scheduledRefetch = () => {
    scheduledRefetch.cancel()

    timeouts = delaysMs.map((delayMs) => {
      const timeoutId = setTimeout(() => {
        timeouts = timeouts.filter((timeout) => timeout !== timeoutId)
        refetch().catch((error) => onError?.(error))
      }, delayMs)
      return timeoutId
    })
  }

  scheduledRefetch.cancel = () => {
    for (const timeout of timeouts) {
      clearTimeout(timeout)
    }
    timeouts = []
  }

  return scheduledRefetch
}
