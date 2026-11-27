import { useEffect } from 'react'
import { createLogger } from '../../utils'
import type { FetchObjectDataInput } from '../../utils/smartObject'

const log = createLogger()

/**
 * Fetches the selected object, then polls it for updates every `intervalMs`.
 * Reads are public, so no wallet needs to be connected. Each tick is a cheap
 * version check until the object changes; an interval of 0 disables polling.
 *
 * The interval can change while mounted (the subscription coming up or
 * failing); that only restarts the timer, not the initial fetch.
 */
export function usePollingBackstop({
  input,
  fetchObjectData,
  setLoading,
  resetTracking,
  intervalMs,
}: {
  input: FetchObjectDataInput | null
  fetchObjectData: (
    input: FetchObjectDataInput,
    isInitialFetch?: boolean,
  ) => Promise<void>
  setLoading: (loading: boolean) => void
  resetTracking: () => void
  /** Polling interval in ms; 0 disables it */
  intervalMs: number
}): void {
  useEffect(() => {
    if (!input) {
      setLoading(false)
      return
    }
    fetchObjectData(input, true)
    return resetTracking
  }, [input, fetchObjectData, setLoading, resetTracking])

  useEffect(() => {
    if (!input) return
    const selectedObjectId = 'itemId' in input ? input.itemId : input.objectId

    if (intervalMs <= 0) {
      log.info(
        '[DappKit] SmartObjectProvider: Polling backstop disabled',
        selectedObjectId,
      )
      return
    }

    const intervalId = setInterval(() => {
      fetchObjectData(input, false)
    }, intervalMs)
    log.info(
      '[DappKit] SmartObjectProvider: Started polling for object:',
      selectedObjectId,
      { pollingInterval: intervalMs },
    )

    return () => {
      clearInterval(intervalId)
      log.info('[DappKit] SmartObjectProvider: Stopped polling')
    }
  }, [input, fetchObjectData, intervalMs])
}
