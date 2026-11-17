import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useRef,
  useState,
} from 'react'
import { getAssemblyWithOwner, type MoveObjectData } from '../../graphql'
import type {
  Assemblies,
  AssemblyType,
  DetailedSmartCharacterResponse,
} from '../../types'
import {
  createLogger,
  getObjectId,
  transformToAssembly,
  transformToCharacter,
} from '../../utils'
import { getDatahubGameInfo } from '../../utils/datahub'
import {
  EMPTY_CONFIRMED_SIGNATURES,
  type FetchObjectDataInput,
  getMoveObjectTypeId,
  primeInventoryTypeVolumes,
  reconcileRefetchedAssembly,
} from '../../utils/smartObject'

const log = createLogger()

type AssemblyWithOwner = Awaited<ReturnType<typeof getAssemblyWithOwner>>

/** Resolves the Sui object ID for a complete input (see isCompleteInput). */
async function resolveObjectId(input: FetchObjectDataInput): Promise<string> {
  if (!('itemId' in input)) {
    log.info('[DappKit] SmartObjectProvider: Fetching object:', {
      objectId: input.objectId,
    })
    return input.objectId
  }

  const objectId = await getObjectId(input.itemId, input.selectedTenant)
  log.info('[DappKit] SmartObjectProvider: Fetching object:', {
    itemId: input.itemId,
    selectedTenant: input.selectedTenant,
  })
  return objectId
}

function isCompleteInput(input: FetchObjectDataInput): boolean {
  return 'itemId' in input
    ? !!input.itemId && !!input.selectedTenant
    : !!input.objectId
}

/** Transforms fetched data into an assembly, enriched with datahub defaults. */
async function buildAssembly(
  objectId: string,
  {
    moveObject,
    assemblyOwner,
    energySource,
    destinationGate,
  }: AssemblyWithOwner,
): Promise<AssemblyType<Assemblies> | null> {
  const typeId = getMoveObjectTypeId(moveObject as MoveObjectData)

  // Fetch datahub game info (name, description, image defaults)
  let datahubInfo = null
  try {
    datahubInfo = await getDatahubGameInfo(parseInt(typeId, 10))
  } catch (err) {
    log.warn(
      '[DappKit] SmartObjectProvider: Failed to fetch datahub info:',
      err,
    )
  }

  const transformed = await transformToAssembly(
    objectId,
    moveObject as MoveObjectData,
    {
      character: assemblyOwner,
      datahubInfo,
      energySource,
      destinationGate,
    },
  )
  primeInventoryTypeVolumes(transformed)
  return transformed
}

/**
 * Holds the assembly, its owner, and loading/error state, and fetches them.
 * Refetches that return unchanged data skip the state update, and stale
 * refetches keep optimistic state (see reconcileRefetchedAssembly).
 */
export function useAssemblyData(): {
  assembly: AssemblyType<Assemblies> | null
  setAssembly: Dispatch<SetStateAction<AssemblyType<Assemblies> | null>>
  assemblyOwner: DetailedSmartCharacterResponse | null
  loading: boolean
  setLoading: Dispatch<SetStateAction<boolean>>
  error: string | null
  fetchObjectData: (
    input: FetchObjectDataInput,
    isInitialFetch?: boolean,
  ) => Promise<void>
  /** Forgets the last fetched data and confirmed values, e.g. when the selection changes. */
  resetTracking: () => void
} {
  const [assembly, setAssembly] = useState<AssemblyType<Assemblies> | null>(
    null,
  )
  const [assemblyOwner, setAssemblyOwner] =
    useState<DetailedSmartCharacterResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const lastDataHashRef = useRef<string | null>(null)
  const confirmedRef = useRef(EMPTY_CONFIRMED_SIGNATURES)

  const applyFetched = useCallback(
    async (
      objectId: string,
      fetched: AssemblyWithOwner,
      isInitialFetch: boolean,
    ) => {
      const transformed = await buildAssembly(objectId, fetched)

      setAssembly((currentAssembly) => {
        if (transformed === null) return null
        const { assembly, confirmed } = reconcileRefetchedAssembly(
          currentAssembly,
          transformed,
          isInitialFetch,
          confirmedRef.current,
        )
        confirmedRef.current = confirmed
        return assembly
      })

      setAssemblyOwner(
        fetched.assemblyOwner
          ? transformToCharacter(fetched.assemblyOwner)
          : null,
      )
    },
    [],
  )

  // Fetch object data with owner/assemblyOwner info.
  // Accepts either { itemId, selectedTenant } (derive Sui object ID) or { objectId } (use directly).
  const fetchObjectData = useCallback(
    async (input: FetchObjectDataInput, isInitialFetch = false) => {
      if (!isCompleteInput(input)) return

      if (isInitialFetch) {
        setLoading(true)
      }
      setError(null)

      try {
        const objectId = await resolveObjectId(input)
        const fetched = await getAssemblyWithOwner(objectId)

        if (!fetched.moveObject) {
          log.warn(
            '[DappKit] SmartObjectProvider: Object not found or not a Move object',
          )
          setAssembly(null)
          setAssemblyOwner(null)
          setError('Object not found or not a Move object')
          return
        }

        // Only update state if the data changed (optimization for polling)
        const dataHash = JSON.stringify({
          moveObject: fetched.moveObject,
          assemblyOwner: fetched.assemblyOwner,
          energySource: fetched.energySource,
        })
        if (isInitialFetch || lastDataHashRef.current !== dataHash) {
          log.info('[DappKit] SmartObjectProvider: Object data updated')
          lastDataHashRef.current = dataHash
          await applyFetched(objectId, fetched, isInitialFetch)
        }
        setError(null)
      } catch (err: unknown) {
        log.error('[DappKit] SmartObjectProvider: Query error:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch object')
      } finally {
        if (isInitialFetch) {
          setLoading(false)
        }
      }
    },
    [applyFetched],
  )

  const resetTracking = useCallback(() => {
    lastDataHashRef.current = null
    confirmedRef.current = EMPTY_CONFIRMED_SIGNATURES
  }, [])

  return {
    assembly,
    setAssembly,
    assemblyOwner,
    loading,
    setLoading,
    error,
    fetchObjectData,
    resetTracking,
  }
}
