import { useStringFlagValue } from '@openfeature/react-sdk'
import { FLAG_DEFINITIONS, type FlagKey } from './config'

/**
 * Read a flag's resolved variant value, typed to the registry keys.
 *
 * The default is taken from the registry so a component always renders sensibly
 * even before the provider is ready. This is the one-liner future flags reuse:
 *
 *   const transport = useFlagVariant('eve-frontier-assembly-event-transport')
 */
export function useFlagVariant<K extends FlagKey>(key: K): string {
  const def = FLAG_DEFINITIONS[key]
  const variants: Record<string, string | boolean | number> = def.variants
  const fallback = String(variants[def.defaultVariant] ?? def.defaultVariant)
  return useStringFlagValue(key, fallback)
}
