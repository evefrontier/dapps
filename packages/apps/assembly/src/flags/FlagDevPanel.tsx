import { useStringFlagValue } from '@openfeature/react-sdk'
import { useState } from 'react'
import { FLAG_DEFINITIONS, type FlagDefinition, type FlagKey } from './config'
import styles from './FlagDevPanel.module.css'
import { resetFlagOverrides, setFlagVariant } from './provider'

/**
 * Internal flag-management UI. Lets you flip flags at runtime while
 * there is no flag backend; changes persist to localStorage and re-render any
 * consumer immediately.
 *
 * Gated at build time by VITE_SHOW_FLAG_PANEL — set it to `true` in the env for
 * the builds where you want the panel (e.g. local `.env`), leave it unset
 * everywhere else so it never ships in a normal production build.
 */
export function isPanelEnabled(): boolean {
  return import.meta.env.VITE_SHOW_FLAG_PANEL === 'true'
}

function FlagRow({ flagKey, def }: { flagKey: FlagKey; def: FlagDefinition }) {
  // Fall back to the default variant's *value* (matching useFlagVariant), not
  // its name, so the active-variant comparison below is correct even when a
  // variant's value differs from its name.
  const current = useStringFlagValue(
    flagKey,
    def.variants[def.defaultVariant] ?? def.defaultVariant,
  )
  const variantNames = Object.keys(def.variants)

  return (
    <div className={styles.row}>
      <div className={styles.rowKey}>{flagKey}</div>
      <div className={styles.rowDescription}>{def.description}</div>
      <div className={styles.variants}>
        {variantNames.map((variant) => {
          const active = def.variants[variant] === current
          return (
            <button
              type="button"
              key={variant}
              onClick={() => void setFlagVariant(flagKey, variant)}
              className={
                active
                  ? `${styles.variant} ${styles.variantActive}`
                  : styles.variant
              }
            >
              {variant}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function FlagDevPanel() {
  const [open, setOpen] = useState(false)
  if (!isPanelEnabled()) return null

  const flagEntries = Object.entries(FLAG_DEFINITIONS) as [
    FlagKey,
    FlagDefinition,
  ][]

  return (
    <div className={styles.panel}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={styles.toggle}
      >
        Feature flags {open ? '▾' : '▸'}
      </button>
      {open && (
        <div>
          {flagEntries.map(([flagKey, def]) => (
            <FlagRow key={flagKey} flagKey={flagKey} def={def} />
          ))}
          <div className={styles.row}>
            <button
              type="button"
              onClick={() => void resetFlagOverrides()}
              className={styles.reset}
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
