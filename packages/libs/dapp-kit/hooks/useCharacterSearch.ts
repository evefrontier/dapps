import { useDeferredValue, useMemo } from 'react'
import type { CharacterSummary } from '../types'
import { searchCharacters } from '../utils/characters'
import { useCharacterDirectory } from './useCharacterDirectory'

/**
 * Hook for searching characters by name or wallet address (never by
 * character id). The query is deferred so typing stays responsive over a
 * large list.
 *
 * @category Hooks - Characters
 * @param query - Search text; `0x…` matches the start of wallet addresses
 * @param options.enabled - False skips fetching the character directory.
 *   Default true.
 * @returns
 *   - `results` - Matching characters, prefix name matches first
 *   - `isLoading` - True while the character list is first being fetched
 *   - `error` - The fetch error, or null
 */
export function useCharacterSearch(
  query: string,
  options: { enabled?: boolean } = {},
): {
  results: CharacterSummary[]
  isLoading: boolean
  error: Error | null
} {
  const { data, isLoading, error } = useCharacterDirectory(options)
  const deferredQuery = useDeferredValue(query)
  const results = useMemo(
    () => (data ? searchCharacters(data, deferredQuery) : []),
    [data, deferredQuery],
  )
  return { results, isLoading, error }
}
