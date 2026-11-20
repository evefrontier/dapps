import type { ReactNode } from 'react'
import { createContext, useCallback, useEffect } from 'react'
import type { SmartObjectContextType } from '../types'
import {
  DEFAULT_EVENT_TRANSPORT,
  DEFAULT_TENANT,
  type EventTransport,
  setActiveEventTransport,
} from '../utils/constants'
import { useEntityData } from './smartObject/useEntityData'
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
 * It uses GraphQL queries to fetch the entity on the Sui blockchain, polling
 * for updates.
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
  eventTransport = DEFAULT_EVENT_TRANSPORT,
}: {
  children: ReactNode
  /** Event transport (grpc | sse); selects the matching GraphQL query endpoint. */
  eventTransport?: EventTransport
}) => {
  // Align the GraphQL query endpoint with the active transport (grpc → standard,
  // sse → cockroach). Kept in an effect so render stays pure (no module-global
  // mutation during render, which misbehaves under strict/concurrent mode).
  useEffect(() => {
    setActiveEventTransport(eventTransport)
  }, [eventTransport])

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

  usePollingBackstop({
    input,
    fetchObjectData,
    setLoading,
    resetTracking,
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
