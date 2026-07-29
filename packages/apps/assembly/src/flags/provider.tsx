import { OpenFeatureProvider } from '@openfeature/react-sdk'
import { OpenFeature, TypedInMemoryProvider } from '@openfeature/web-sdk'
import type { ReactNode } from 'react'
import {
  buildFlagConfiguration,
  type FlagKey,
  loadFlagOverrides,
  saveFlagOverrides,
} from './config'
import { FlagDevPanel } from './FlagDevPanel'

/**
 * Offline feature-flag setup.
 *
 * Flags are evaluated in-process by OpenFeature's InMemoryProvider — there is
 * no flag backend yet. Values come from the registry in `config.ts`, overridden
 * at runtime by the internal dev panel (persisted to localStorage).
 *
 * When a GO Feature Flag relay proxy becomes available, swap the provider
 * instance below for `GoFeatureFlagWebProvider` (from
 * `@openfeature/go-feature-flag-web-provider`) — nothing else in the app
 * changes, since everything consumes flags through the OpenFeature client.
 */

// Single provider instance so the dev panel can push runtime updates to the
// same object the OpenFeature client evaluates against.
const provider = new TypedInMemoryProvider(
  buildFlagConfiguration(loadFlagOverrides()),
)

// Register synchronously at module load. InMemoryProvider is ready immediately,
// so flag reads resolve on first render without an async gate.
OpenFeature.setProvider(provider)

// Establish an evaluation context up front. Tenant comes from the URL (same
// source SmartObjectProvider uses). This is a no-op for static in-memory
// evaluation today, but sets the pattern for targeted rules under GOFF later.
const tenant =
  new URLSearchParams(window.location.search).get('tenant')?.trim() || undefined
void OpenFeature.setContext({
  ...(tenant ? { targetingKey: tenant, tenant } : {}),
})

/**
 * Override a flag's resolved variant at runtime (dev panel), persisting the
 * choice so it survives reloads. Updating the provider emits a
 * ConfigurationChanged event that re-renders any component reading the flag.
 */
export async function setFlagVariant(
  key: FlagKey,
  variant: string,
): Promise<void> {
  const overrides = { ...loadFlagOverrides(), [key]: variant }
  saveFlagOverrides(overrides)
  await provider.putConfiguration(buildFlagConfiguration(overrides))
}

/** Reset all dev-panel overrides back to the registry defaults. */
export async function resetFlagOverrides(): Promise<void> {
  saveFlagOverrides({})
  await provider.putConfiguration(buildFlagConfiguration({}))
}

/**
 * App-root feature-flag provider. Wrap the tree in this; it exposes the
 * OpenFeature React context and renders the internal dev panel (dev builds /
 * `?flags` only).
 */
export function FlagsProvider({ children }: { children: ReactNode }) {
  return (
    <OpenFeatureProvider>
      {children}
      <FlagDevPanel />
    </OpenFeatureProvider>
  )
}
