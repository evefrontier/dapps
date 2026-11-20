import { useEffect } from 'react'
import { createLogger } from '../../utils'
import { getPollingInterval } from '../../utils/constants'
import type { FetchObjectDataInput } from '../../utils/smartObject'

const log = createLogger()

/**
 * Fetches the selected object once connected, then polls it for updates.
 * Polling is the only update source; each tick is a cheap version check
 * until the object changes. A configured interval of 0 disables it entirely.
 */
export function usePollingBackstop({
  input,
  isConnected,
  fetchObjectData,
  setLoading,
  resetTracking,
}: {
  input: FetchObjectDataInput | null
  isConnected: boolean
  fetchObjectData: (
    input: FetchObjectDataInput,
    isInitialFetch?: boolean,
  ) => Promise<void>
  setLoading: (loading: boolean) => void
  resetTracking: () => void
}): void {
  useEffect(() => {
    if (!input || !isConnected) {
      setLoading(false)
      return
    }

    fetchObjectData(input, true)
    const selectedObjectId = 'itemId' in input ? input.itemId : input.objectId

    const pollingInterval = getPollingInterval()
    if (pollingInterval <= 0) {
      log.info(
        '[DappKit] SmartObjectProvider: Polling backstop disabled (VITE_POLLING_INTERVAL=0)',
        selectedObjectId,
      )
      return resetTracking
    }

    const intervalId = setInterval(() => {
      fetchObjectData(input, false)
    }, pollingInterval)
    log.info(
      '[DappKit] SmartObjectProvider: Started polling for object:',
      selectedObjectId,
      { pollingInterval },
    )

    return () => {
      clearInterval(intervalId)
      log.info('[DappKit] SmartObjectProvider: Stopped polling')
      resetTracking()
    }
  }, [input, isConnected, fetchObjectData, setLoading, resetTracking])
}
