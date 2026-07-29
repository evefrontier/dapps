/**
 * Structural shape of OpenFeature's in-memory flag configuration. The SDK does
 * not export its `FlagConfiguration` type publicly, so we declare the subset we
 * use; it stays assignable to `InMemoryProvider`/`putConfiguration` inputs.
 */
export type InMemoryFlagConfiguration = Record<
  string,
  {
    variants: Record<string, string | boolean | number>
    defaultVariant: string
    disabled: boolean
  }
>

/**
 * Feature-flag registry — single source of truth. Add a flag here and the
 * provider config, dev panel, and typed hook all derive from it. Mirrors the
 * GOFF (`variations` + default) shape for an easy port to the relay proxy later.
 */
export type FlagDefinition = {
  /** Human-readable description shown in the dev panel. */
  description: string
  /** Variant name → value. Values are usually strings; booleans/numbers allowed. */
  variants: Record<string, string | boolean | number>
  /** Variant resolved by default (static evaluation). */
  defaultVariant: string
}

export const FLAG_DEFINITIONS = {
  'eve-frontier-assembly-event-transport': {
    description:
      'Real-time event transport feeding optimistic updates (grpc | sse). Consumption wired in a later PR.',
    variants: { grpc: 'grpc', sse: 'sse' },
    defaultVariant: 'grpc',
  },
} satisfies Record<string, FlagDefinition>

export type FlagKey = keyof typeof FLAG_DEFINITIONS

/** Local-only overrides set through the dev panel, persisted across reloads. */
export type FlagOverrides = Partial<Record<FlagKey, string>>

const STORAGE_KEY = 'eve-frontier-flag-overrides'

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Read dev-panel overrides from localStorage; tolerant of missing/corrupt data. */
export function loadFlagOverrides(): FlagOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!isPlainObject(parsed)) return {}
    // Keep only known flags whose override is a valid variant name.
    const result: FlagOverrides = {}
    for (const [key, def] of Object.entries(FLAG_DEFINITIONS)) {
      const value = parsed[key]
      if (typeof value === 'string' && value in def.variants) {
        result[key as FlagKey] = value
      }
    }
    return result
  } catch {
    return {}
  }
}

/** Persist dev-panel overrides to localStorage. */
export function saveFlagOverrides(overrides: FlagOverrides): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // Ignore storage failures (private mode, quota) — flags just won't persist.
  }
}

/**
 * Build the in-memory provider's flag configuration from the registry, applying
 * any dev-panel overrides. Static evaluation resolves each flag to its
 * `defaultVariant`, so an override simply changes that default.
 */
export function buildFlagConfiguration(
  overrides: FlagOverrides = {},
): InMemoryFlagConfiguration {
  return Object.fromEntries(
    Object.entries(FLAG_DEFINITIONS).map(([key, def]) => {
      const override = overrides[key as FlagKey]
      const defaultVariant =
        override && override in def.variants ? override : def.defaultVariant
      return [key, { variants: def.variants, defaultVariant, disabled: false }]
    }),
  )
}
