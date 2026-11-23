import { type UseQueryResult, useQuery } from '@tanstack/react-query'
import type { CharacterSummary } from '../types'
import { fetchCharacterDirectory } from '../utils/characters'
import { useSmartObject } from './useSmartObject'

const DIRECTORY_STALE_TIME_MS = 5 * 60 * 1000

/**
 * Hook for the list of every character, built from world events and cached
 * per tenant. Characters only change name or get created occasionally, so the
 * list is kept for five minutes before it is refetched.
 *
 * @category Hooks - Characters
 * @param options.enabled - False skips the fetch (it pages in every character
 *   event), for callers that only sometimes need the list. Default true.
 * @returns The React Query result; `data` is every character
 */
export function useCharacterDirectory(
  options: { enabled?: boolean } = {},
): UseQueryResult<CharacterSummary[], Error> {
  const { tenant } = useSmartObject()
  return useQuery({
    queryKey: ['characterDirectory', tenant],
    queryFn: () => fetchCharacterDirectory(tenant || undefined),
    staleTime: DIRECTORY_STALE_TIME_MS,
    enabled: options.enabled ?? true,
  })
}
