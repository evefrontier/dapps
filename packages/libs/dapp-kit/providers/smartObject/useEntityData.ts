import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
} from 'react'
import { getObjectLatestVersion } from '../../graphql'
import type { EntityData, EntityOwner } from '../../types'
import {
  createLogger,
  fetchEntity,
  fetchEntityOwner,
  getObjectId,
  isEntity,
  parseEntity,
} from '../../utils'
import type { FetchObjectDataInput } from '../../utils/smartObject'

const log = createLogger()

/** Resolves the Sui object ID for a complete input (see isCompleteInput). */
async function resolveObjectId(input: FetchObjectDataInput): Promise<string> {
  if (!('itemId' in input)) {
    log.info('[DappKit] SmartObjectProvider: Fetching entity:', {
      objectId: input.objectId,
    })
    return input.objectId
  }

  const objectId = await getObjectId(input.itemId, input.selectedTenant)
  log.info('[DappKit] SmartObjectProvider: Fetching entity:', {
    itemId: input.itemId,
    selectedTenant: input.selectedTenant,
    objectId,
  })
  return objectId
}

function isCompleteInput(input: FetchObjectDataInput): boolean {
  return 'itemId' in input
    ? !!input.itemId && !!input.selectedTenant
    : !!input.objectId
}

/**
 * Holds the selected world entity, its owner, and loading/error state, and
 * fetches them. Refetches first compare the object's latest version and skip
 * the full fetch when it hasn't changed.
 */
export function useEntityData(): {
  entity: EntityData | null
  entityOwner: EntityOwner | null
  loading: boolean
  setLoading: Dispatch<SetStateAction<boolean>>
  error: string | null
  fetchObjectData: (
    input: FetchObjectDataInput,
    isInitialFetch?: boolean,
  ) => Promise<void>
  /** Forgets the last fetched version and owner, e.g. when the selection changes. */
  resetTracking: () => void
} {
  const [entity, setEntity] = useState<EntityData | null>(null)
  const [entityOwner, setEntityOwner] = useState<EntityOwner | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const lastVersionRef = useRef<number | null>(null)
  const lastAccessCapIdRef = useRef<string | null | undefined>(undefined)

  const fetchObjectData = useCallback(
    async (input: FetchObjectDataInput, isInitialFetch = false) => {
      if (!isCompleteInput(input)) return

      if (isInitialFetch) {
        setLoading(true)
      }
      setError(null)

      try {
        const objectId = await resolveObjectId(input)

        // Only refetch everything if the object changed (optimization for polling)
        if (!isInitialFetch && lastVersionRef.current !== null) {
          const latest = await getObjectLatestVersion(objectId)
          const version = latest.data?.latestVersion.nodes[0]?.version
          if (version === lastVersionRef.current) return
        }

        const raw = await fetchEntity(objectId)
        if (!raw || !isEntity(raw)) {
          log.warn('[DappKit] SmartObjectProvider: Object is not an entity')
          setEntity(null)
          setEntityOwner(null)
          setError('Object not found or not an entity')
          lastVersionRef.current = null
          return
        }

        const parsed = parseEntity(raw)
        log.info('[DappKit] SmartObjectProvider: Entity data updated', parsed)
        lastVersionRef.current = parsed.version
        setEntity(parsed)

        // The owner only changes with the AccessCap
        if (parsed.accessCapId !== lastAccessCapIdRef.current) {
          setEntityOwner(
            parsed.accessCapId
              ? await fetchEntityOwner(parsed.accessCapId)
              : null,
          )
          lastAccessCapIdRef.current = parsed.accessCapId
        }
        setError(null)
      } catch (err: unknown) {
        log.error('[DappKit] SmartObjectProvider: Query error:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch entity')
      } finally {
        if (isInitialFetch) {
          setLoading(false)
        }
      }
    },
    [],
  )

  const resetTracking = useCallback(() => {
    lastVersionRef.current = null
    lastAccessCapIdRef.current = undefined
  }, [])

  return {
    entity,
    entityOwner,
    loading,
    setLoading,
    error,
    fetchObjectData,
    resetTracking,
  }
}
