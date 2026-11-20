import { useDeferredValue, useMemo } from 'react'
import type { CharacterSummary } from '../types'
import { searchCharacters } from '../utils/characters'
import { useCharacterDirectory } from './useCharacterDirectory'

/**
 * Hook for searching characters by name (see {@link searchCharacters}). The
 * query is deferred so typing stays responsive over a large list.
 *
 * @category Hooks - Characters
 * @param query - Search text
 * @param options.enabled - False skips fetching the character directory.
 *   Default true.
 * @param options.limit - Maximum number of results. Default 20.
 * @returns
 *   - `results` - Matching characters, prefix name matches first
 *   - `isLoading` - True while the character list is first being fetched
 *   - `error` - The fetch error, or null
 */
export function useCharacterSearch(
  query: string,
  options: { enabled?: boolean; limit?: number } = {},
): {
  results: CharacterSummary[]
  isLoading: boolean
  error: Error | null
} {
  const { limit, ...directoryOptions } = options
  const { data, isLoading, error } = useCharacterDirectory(directoryOptions)
  const deferredQuery = useDeferredValue(query)
  const results = useMemo(
    () => (data ? searchCharacters(data, deferredQuery, limit) : []),
    [data, deferredQuery, limit],
  )
  return { results, isLoading, error }
}
