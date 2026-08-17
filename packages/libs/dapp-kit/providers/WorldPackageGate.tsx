import { type ReactNode, useEffect, useState } from 'react'
import { createLogger } from '../utils'
import {
  resolveWorldPackageId,
  tryResolveWorldPackageIdSync,
} from '../utils/mvrPackageResolution'

const log = createLogger()

/**
 * Gates rendering of its children until the EVE World package id has been
 * resolved from `VITE_EVE_WORLD_PACKAGE_ID` to its original (type-origin)
 * address. Mount it above any consumer that builds type strings from
 * {@link getEveWorldPackageId} (e.g. `SmartObjectProvider`).
 *
 * A raw 0x env value resolves synchronously via
 * {@link tryResolveWorldPackageIdSync}, so the gate starts `ready` and renders
 * no fallback. An MVR name (e.g. `@evefrontier/world-test`) requires a network
 * round-trip: `fallback` renders until it lands so no downstream query
 * interpolates an unresolved name into a type filter.
 *
 * If resolution fails after its retries the error is rethrown during render so
 * the app's top-level error boundary owns the presentation — rather than this
 * library shipping its own error UI, or hanging forever on the fallback.
 *
 * @category Providers
 */
const WorldPackageGate = ({
  children,
  fallback = null,
}: {
  children: ReactNode
  fallback?: ReactNode
}) => {
  const [state, setState] = useState<{
    status: 'pending' | 'ready' | 'error'
    error?: unknown
  }>(() =>
    tryResolveWorldPackageIdSync()
      ? { status: 'ready' }
      : { status: 'pending' },
  )

  useEffect(() => {
    if (state.status !== 'pending') return
    let cancelled = false
    resolveWorldPackageId()
      .then(() => {
        if (!cancelled) setState({ status: 'ready' })
      })
      .catch((err) => {
        log.error('[DappKit] Failed to resolve world package id', err)
        if (!cancelled) setState({ status: 'error', error: err })
      })
    return () => {
      cancelled = true
    }
  }, [state.status])

  // Surface to the nearest error boundary instead of shipping UI from the lib.
  if (state.status === 'error') throw state.error
  return <>{state.status === 'ready' ? children : fallback}</>
}

export default WorldPackageGate
