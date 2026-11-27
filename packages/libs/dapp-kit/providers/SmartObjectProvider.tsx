import type { ReactNode } from 'react'
import { createContext, useCallback } from 'react'
import type { SmartObjectContextType } from '../types'
import {
  backstopInterval,
  DEFAULT_TENANT,
  DEFAULT_UPDATE_TRANSPORT,
  type UpdateTransport,
} from '../utils/constants'
import { useEntityData } from './smartObject/useEntityData'
import { useEntitySubscription } from './smartObject/useEntitySubscription'
import { useObjectSelection } from './smartObject/useObjectSelection'
import { usePollingBackstop } from './smartObject/usePollingBackstop'

export type { FetchObjectDataInput } from '../utils/smartObject'

/** @category Providers */
export const SmartObjectContext = createContext<SmartObjectContextType>({
  tenant: DEFAULT_TENANT,
  entity: null,
  entityOwner: null,
  assembly: null,
  assemblyOwner: null,
  loading: true,
  error: null,
  refetch: async () => {},
})

/**
 * SmartObjectProvider component provides context for the selected world entity.
 * It uses GraphQL queries to fetch the entity on the Sui blockchain and keeps
 * it up to date by `updateTransport`:
 * - `subscription` (the default): refetches when the GraphQL subscription
 *   delivers one of the entity's inventory or power events, with slow polling
 *   as a backstop; if the subscription fails, it polls as with `polling`.
 * - `polling`: polls every POLLING_INTERVAL.
 *
 * The entity loads whether or not a wallet is connected; reads are public.
 *
 * The provider fetches both the entity and its owner (entityOwner):
 * 1. Fetches the entity with its components and action maps
 * 2. Reads the holder of the entity's AccessCap
 * 3. When the cap is parked on a Character, fetches that Character entity
 *
 * @category Providers
 */
const SmartObjectProvider = ({
  children,
  updateTransport = DEFAULT_UPDATE_TRANSPORT,
}: {
  children: ReactNode
  /** How the entity is kept up to date; `subscription` by default */
  updateTransport?: UpdateTransport
}) => {
  const { selection, input } = useObjectSelection()
  const {
    entity,
    entityOwner,
    loading,
    setLoading,
    error,
    fetchObjectData,
    resetTracking,
  } = useEntityData()

  // After an event: skip only the version check (the event means it changed)
  // and otherwise refetch as a poll does, so a running fetch is not cut short,
  // a lagging indexer does not clear the entity, and loading is not shown
  const refetchOnEvent = useCallback(async () => {
    if (input) await fetchObjectData(input, false, { skipVersionCheck: true })
  }, [input, fetchObjectData])

  const subscriptionStatus = useEntitySubscription({
    transport: updateTransport,
    entityId: entity?.id ?? null,
    tenant: selection?.tenant,
    refetch: refetchOnEvent,
  })

  usePollingBackstop({
    input,
    fetchObjectData,
    setLoading,
    resetTracking,
    intervalMs: backstopInterval(updateTransport, subscriptionStatus),
  })

  // Refetch with retries after a mutation (e.g. metadata save)
  // so the indexer can catch up.
  const refetch = useCallback(async () => {
    if (!input) return
    await fetchObjectData(input, true)
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1500)
    })
    await fetchObjectData(input, true)
  }, [input, fetchObjectData])

  return (
    <SmartObjectContext.Provider
      value={{
        tenant: selection?.tenant ?? '',
        entity,
        entityOwner,
        assembly: null,
        assemblyOwner: null,
        loading,
        error,
        refetch,
      }}
    >
      {children}
    </SmartObjectContext.Provider>
  )
}

export default SmartObjectProvider
