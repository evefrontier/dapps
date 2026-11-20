import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getDatahubGameInfo, typeNamesFrom } from '../utils/datahub'

/**
 * Hook for display names of on-chain type ids (generic modules, airlocks,
 * airlock items), looked up in Datahub. Each id is fetched once and kept for
 * the session; type names do not change.
 *
 * @category Hooks - Datahub
 * @param typeIds - Type ids as stored on chain (decimal strings)
 * @returns Type id → name, for the ids that have loaded
 */
export function useTypeNames(typeIds: string[]): Record<string, string> {
  const unique = useMemo(() => [...new Set(typeIds)], [typeIds])
  const results = useQueries({
    queries: unique.map((typeId) => ({
      queryKey: ['datahubType', typeId],
      queryFn: () => getDatahubGameInfo(Number(typeId)),
      staleTime: Number.POSITIVE_INFINITY,
    })),
  })
  return useMemo(
    () =>
      typeNamesFrom(
        unique,
        results.map((result) => result.data),
      ),
    [results, unique],
  )
}
