import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import type { CharacterSummary } from '../types'
import { searchCharacters, searchIndexedCharacters } from '../utils/characters'
import { useCharacterDirectory } from './useCharacterDirectory'
import { useSmartObject } from './useSmartObject'

const INDEXER_DEBOUNCE_MS = 500
const INDEXER_STALE_TIME_MS = 60 * 1000

/** Matches {@link searchIndexedCharacters}: an address is not searched. */
function isSearchable(search: string): boolean {
  return !!search && !search.toLowerCase().startsWith('0x')
}

/** `value`, once it has stopped changing for `delayMs`. */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/**
 * Hook for searching characters by name.
 *
 * With `source: 'events'` (the default) the whole character directory is
 * fetched once and searched client-side (see {@link searchCharacters}); the
 * query is deferred so typing stays responsive over a large list. With
 * `source: 'indexer'` each query, debounced, is sent to the EVE Frontier Sui
 * indexer (see {@link searchIndexedCharacters}) and the directory is never
 * fetched.
 *
 * @category Hooks - Characters
 * @param query - Search text
 * @param options.enabled - False skips fetching. Default true.
 * @param options.limit - Maximum number of results. Default 20.
 * @param options.source - Where to search: `'events'` or `'indexer'`.
 *   Default `'events'`.
 * @returns
 *   - `results` - Matching characters; prefix name matches first for
 *     `'events'`, the indexer's order for `'indexer'`
 *   - `isLoading` - True while the character list is first being fetched
 *     (`'events'`), or before the first indexer results arrive (`'indexer'`);
 *     later queries keep the previous results until theirs arrive
 *   - `error` - The fetch error, or null
 */
export function useCharacterSearch(
  query: string,
  options: {
    enabled?: boolean
    limit?: number
    source?: 'events' | 'indexer'
  } = {},
): {
  results: CharacterSummary[]
  isLoading: boolean
  error: Error | null
} {
  const { limit, source = 'events', enabled = true } = options
  const { tenant } = useSmartObject()

  const directory = useCharacterDirectory({
    enabled: enabled && source === 'events',
  })
  const deferredQuery = useDeferredValue(query)
  const directoryResults = useMemo(
    () =>
      directory.data
        ? searchCharacters(directory.data, deferredQuery, limit)
        : [],
    [directory.data, deferredQuery, limit],
  )

  const search = useDebouncedValue(query.trim(), INDEXER_DEBOUNCE_MS)
  const indexed = useQuery({
    queryKey: ['characterSearch', tenant, search, limit],
    queryFn: ({ signal }) =>
      searchIndexedCharacters(search, {
        tenant: tenant || undefined,
        limit,
        signal,
      }),
    staleTime: INDEXER_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    enabled: enabled && source === 'indexer' && isSearchable(search),
  })

  if (source === 'events') {
    return {
      results: directoryResults,
      isLoading: directory.isLoading,
      error: directory.error,
    }
  }
  // While a new query is in flight the last results stay up, so typing does
  // not flash a spinner; loading is only reported before the first results
  const typedSearchable = isSearchable(query.trim())
  return {
    results: typedSearchable ? (indexed.data ?? []) : [],
    isLoading: typedSearchable && indexed.data === undefined && !indexed.error,
    error: typedSearchable ? indexed.error : null,
  }
}
