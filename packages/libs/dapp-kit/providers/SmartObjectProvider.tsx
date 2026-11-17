import type { ReactNode } from 'react'
import { createContext, useCallback, useEffect } from 'react'
import { useConnection } from '../hooks/useConnection'
import type { SmartObjectContextType } from '../types'
import {
  DEFAULT_EVENT_TRANSPORT,
  DEFAULT_TENANT,
  type EventTransport,
  setActiveEventTransport,
} from '../utils/constants'
import { useAssemblyData } from './smartObject/useAssemblyData'
import { useAssemblyEventStream } from './smartObject/useAssemblyEventStream'
import { useObjectSelection } from './smartObject/useObjectSelection'
import { usePollingBackstop } from './smartObject/usePollingBackstop'

export type { FetchObjectDataInput } from '../utils/smartObject'

/** @category Providers */
export const SmartObjectContext = createContext<SmartObjectContextType>({
  tenant: DEFAULT_TENANT,
  assembly: null,
  assemblyOwner: null,
  loading: true,
  error: null,
  refetch: async () => {},
})

/**
 * SmartObjectProvider component provides context for smart objects data.
 * It uses GraphQL queries to fetch objects on the Sui blockchain
 * from the EVE Frontier package, with optional polling for updates.
 *
 * The provider fetches both the assembly data and its owner (assemblyOwner) information:
 * 1. Fetches assembly data with dynamic fields
 * 2. Uses owner_cap_id to resolve the Character OwnerCap
 * 3. Fetches full assemblyOwner data from the Character ID
 *
 * @category Providers
 */
const SmartObjectProvider = ({
  children,
  eventTransport = DEFAULT_EVENT_TRANSPORT,
}: {
  children: ReactNode
  /** Real-time event transport for optimistic updates (grpc | sse). */
  eventTransport?: EventTransport
}) => {
  // Align the GraphQL query endpoint with the active transport (grpc → standard,
  // sse → cockroach). Kept in an effect so render stays pure (no module-global
  // mutation during render, which misbehaves under strict/concurrent mode).
  useEffect(() => {
    setActiveEventTransport(eventTransport)
  }, [eventTransport])

  const { isConnected } = useConnection()
  const { selection, input } = useObjectSelection()
  const {
    assembly,
    setAssembly,
    assemblyOwner,
    loading,
    setLoading,
    error,
    fetchObjectData,
    resetTracking,
  } = useAssemblyData()

  usePollingBackstop({
    input,
    isConnected,
    fetchObjectData,
    setLoading,
    resetTracking,
  })
  useAssemblyEventStream({
    selection,
    input,
    isConnected,
    eventTransport,
    assembly,
    setAssembly,
    fetchObjectData,
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
        assembly,
        assemblyOwner,
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
