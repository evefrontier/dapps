import type { UpdateTransport } from '@evefrontier/dapp-kit'
import { useStringFlagValue } from '@openfeature/react-sdk'
import { FLAG_DEFINITIONS, type FlagKey } from './config'
import { resolveUpdateTransport } from './updateTransport'

/**
 * Read a flag's resolved variant value, typed to the registry keys.
 *
 * The default is taken from the registry so a component always renders sensibly
 * even before the provider is ready. This is the one-liner future flags reuse:
 *
 *   const viewAs = useFlagVariant('assembly-view-as')
 */
export function useFlagVariant<K extends FlagKey>(key: K): string {
  const def = FLAG_DEFINITIONS[key]
  const variants: Record<string, string> = def.variants
  const fallback = variants[def.defaultVariant] ?? def.defaultVariant
  return useStringFlagValue(key, fallback)
}

/**
 * How the selected Assembly is kept up to date, from the
 * `assembly-update-transport` flag: `subscription` unless it is `polling`.
 */
export function useUpdateTransport(): UpdateTransport {
  return resolveUpdateTransport(useFlagVariant('assembly-update-transport'))
}
