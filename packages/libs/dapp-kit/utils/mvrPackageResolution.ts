import { executeGraphQLQuery } from '../graphql/client'
import type { SuiGraphqlNetwork } from '../types'
import {
  DEFAULT_GRAPHQL_NETWORK,
  getEveWorldPackageRef,
  getResolvedWorldPackageId,
  HEX_ADDRESS,
  setResolvedWorldPackageId,
} from './constants'
import { createLogger } from './logger'

const log = createLogger()

/** Max attempts (initial + retries) for the two-step network resolution. */
const MAX_RESOLVE_ATTEMPTS = 3
/** Base backoff delay; grows exponentially per retry. */
const RETRY_BASE_DELAY_MS = 500

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * MVR resolution service base URL for a network. MVR only serves mainnet and
 * testnet; any other network (e.g. devnet) has no MVR service, so we throw a
 * permanent error rather than silently resolve against the wrong network — that
 * would return a plausible-but-wrong id. Called once before the retry loop so
 * the throw is not retried.
 */
const mvrBaseUrl = (network: SuiGraphqlNetwork): string => {
  switch (network) {
    case 'mainnet':
      return 'https://mainnet.mvr.mystenlabs.com'
    case 'testnet':
      return 'https://testnet.mvr.mystenlabs.com'
    default:
      throw new Error(
        `MVR name resolution is not supported on "${network}"; ` +
          `set VITE_EVE_WORLD_PACKAGE_ID to a raw 0x address on this network.`,
      )
  }
}

/**
 * Resolve an MVR name (e.g. `@evefrontier/world-test`) to its LATEST published
 * package address via the MVR bulk resolution endpoint.
 *
 * Note: MVR returns the latest version's address, which is the correct target
 * for `moveCall`s but NOT for type filters — see {@link resolveOriginalPackageId}.
 *
 * TODO: The name -> latest -> origin resolution exists because our Sui
 * GraphQL endpoint (GRAPHQL_ENDPOINTS) has no MVR fields yet. Once it exposes
 * `packageByName`/`typeByName`, delete this function and resolve the name
 * straight to the origin in a single GraphQL call inside
 * `resolveOriginalPackageId`. Check support with:
 *   curl -s -X POST <endpoint> -H 'Content-Type: application/json' \
 *     -d '{"query":"{ __type(name:\"Query\"){ fields{ name } } }"}'
 * and look for `packageByName` (today it errors GRAPHQL_VALIDATION_FAILED).
 */
async function resolveMvrLatest(
  name: string,
  baseUrl: string,
): Promise<string> {
  const res = await fetch(`${baseUrl}/v1/resolution/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ names: [name] }),
  })
  if (!res.ok) {
    throw new Error(`MVR resolution failed for "${name}": HTTP ${res.status}`)
  }
  const json = (await res.json()) as {
    resolution?: Record<string, { package_id?: string }>
  }
  const id = json.resolution?.[name]?.package_id
  if (!id) {
    throw new Error(`MVR returned no package_id for "${name}"`)
  }
  return id
}

/**
 * Given any published version's package address, return the ORIGINAL (version 1)
 * package address — the type-origin id.
 *
 * Move type identity is pinned to the package a type was first published in, so
 * on-chain object type tags always carry the original address regardless of how
 * many times the package has since been upgraded. This is the value that must be
 * interpolated into GraphQL/gRPC `type:` filters, and it matches what
 * `@mysten/mvr-static`'s `types` map (and the Go resolution list) encode.
 */
async function resolveOriginalPackageId(anyVersionId: string): Promise<string> {
  // Route through the shared GraphQL client so endpoint selection (incl. the
  // sse/cockroach transport) and the X-Client-ID header stay consistent with
  // every other GraphQL call in the package.
  const json = await executeGraphQLQuery<{
    package?: { packageAt?: { address?: string } | null } | null
  }>(
    'query($a: SuiAddress!) { package(address: $a) { packageAt(version: 1) { address } } }',
    { a: anyVersionId },
  )
  const original = json.data?.package?.packageAt?.address
  if (!original) {
    const detail = json.errors?.map((e) => e.message).join('; ') ?? 'no data'
    throw new Error(
      `Could not resolve original package id for ${anyVersionId}: ${detail}`,
    )
  }
  return original
}

/**
 * Resolve `VITE_EVE_WORLD_PACKAGE_ID` to the ORIGINAL (type-origin) package
 * address and cache it for the module lifetime. Idempotent — subsequent calls
 * return the cached value without a network round-trip.
 *
 * - A raw `0x…` address is treated as already-original and used verbatim.
 * - An MVR name (`@evefrontier/world-<tier>`) is resolved to its latest version
 *   via MVR, then mapped back to version 1 via Sui GraphQL.
 *
 * `EveFrontierProvider` awaits this at bootstrap so every synchronous
 * {@link getEveWorldPackageId} call downstream is safe.
 *
 * The two-step network resolution is retried with exponential backoff to ride
 * out transient MVR/GraphQL failures; if every attempt fails the promise
 * rejects so the caller can surface an error rather than hang. A missing env
 * var or a malformed value is a permanent error and is not retried.
 *
 * @param network - Network to resolve against. Defaults to the app's default
 *   GraphQL network.
 * @returns The original 0x package id
 * @throws If the env var is unset, or resolution fails after all retries
 * @category Utilities - Config
 */
export async function resolveWorldPackageId(
  network: SuiGraphqlNetwork = DEFAULT_GRAPHQL_NETWORK,
): Promise<string> {
  const cached = getResolvedWorldPackageId()
  if (cached) return cached

  // Throws synchronously (via rejection) if the env var is unset — not retried.
  const raw = getEveWorldPackageRef()

  if (HEX_ADDRESS.test(raw)) {
    setResolvedWorldPackageId(raw)
    return raw
  }

  // Permanent errors (unsupported network) throw here, before the loop.
  const baseUrl = mvrBaseUrl(network)

  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_RESOLVE_ATTEMPTS; attempt++) {
    try {
      const latest = await resolveMvrLatest(raw, baseUrl)
      const original = await resolveOriginalPackageId(latest)
      log.info('[DappKit] Resolved world package', {
        name: raw,
        latest,
        original,
      })
      setResolvedWorldPackageId(original)
      return original
    } catch (err) {
      lastError = err
      if (attempt < MAX_RESOLVE_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY_MS * 2 ** (attempt - 1)
        log.warn(
          `[DappKit] World package resolution attempt ${attempt}/${MAX_RESOLVE_ATTEMPTS} failed; retrying in ${delay}ms`,
          err,
        )
        await sleep(delay)
      }
    }
  }

  throw new Error(
    `Failed to resolve world package "${raw}" after ${MAX_RESOLVE_ATTEMPTS} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  )
}

/**
 * Synchronously satisfy the resolution if it needs no network — i.e. the value
 * is already cached, or the env var is a raw 0x address (populating the cache
 * as a side effect). Returns `true` when {@link getEveWorldPackageId} is safe to
 * call immediately, `false` when an async {@link resolveWorldPackageId} is still
 * required (MVR name) or the env is unusable.
 *
 * Lets `EveFrontierProvider` avoid rendering a fallback for hex-address envs.
 * @category Utilities - Config
 */
export function tryResolveWorldPackageIdSync(): boolean {
  if (getResolvedWorldPackageId() !== null) return true
  let raw: string
  try {
    raw = getEveWorldPackageRef()
  } catch {
    return false
  }
  if (HEX_ADDRESS.test(raw)) {
    setResolvedWorldPackageId(raw)
    return true
  }
  return false
}
