// ============================================================================
// Environment Variable Helpers
// ============================================================================

import { TENANT_CONFIG, type TenantId } from '@evefrontier/wallet-core/tenant'
import type { SuiGraphqlNetwork } from '../types'

export {
  getEveCoinType,
  isEveCoinType,
} from '@evefrontier/wallet-core/eve-token'
export {
  DEFAULT_TENANT,
  EVE_PACKAGE_ID_BY_TENANT,
  TenantId,
  WORLD_PACKAGES,
  type WorldPackage,
} from '@evefrontier/wallet-core/tenant'

// ============================================================================
// Environment-Based Configuration
// ============================================================================

function isSuiGraphqlNetwork(value: string): value is SuiGraphqlNetwork {
  return SUI_GRAPHQL_NETWORKS.includes(value as SuiGraphqlNetwork)
}

/**
 * Get the Sui GraphQL query endpoint URL for the given network.
 *
 * Unknown networks fall back to
 * testnet to avoid returning undefined.
 * @param env - Network identifier (testnet, devnet, mainnet). Defaults to testnet.
 * @returns The GraphQL endpoint URL
 * @category Utilities - Config
 */
export function getSuiGraphqlEndpoint(
  env: string = DEFAULT_GRAPHQL_NETWORK,
): string {
  const network = isSuiGraphqlNetwork(env) ? env : DEFAULT_GRAPHQL_NETWORK
  return GRAPHQL_ENDPOINTS[network]
}

/**
 * Get the Sui GraphQL subscription endpoint URL for the given network: the
 * second URL beside {@link getSuiGraphqlEndpoint}. Subscriptions are served
 * over SSE at `/graphql/subscriptions` on the same host; the query URL rejects
 * them. VITE_SUI_GRAPHQL_SUBSCRIPTION_URL overrides it for every network, as
 * the counterpart of an overridden query URL.
 *
 * @param env - Network identifier (testnet, devnet, mainnet). Defaults to testnet.
 * @returns The GraphQL subscription endpoint URL
 * @category Utilities - Config
 */
export function getSuiGraphqlSubscriptionEndpoint(
  env: string = DEFAULT_GRAPHQL_NETWORK,
): string {
  const override = import.meta.env.VITE_SUI_GRAPHQL_SUBSCRIPTION_URL
  if (override) return override
  const network = isSuiGraphqlNetwork(env) ? env : DEFAULT_GRAPHQL_NETWORK
  return GRAPHQL_SUBSCRIPTION_ENDPOINTS[network]
}

/**
 * Optional bearer token for the GraphQL subscription, from
 * VITE_GRAPHQL_SUBSCRIPTION_AUTH_TOKEN. The public endpoints need none.
 * @category Utilities - Config
 */
export function getGraphqlSubscriptionAuthToken(): string | undefined {
  return import.meta.env.VITE_GRAPHQL_SUBSCRIPTION_AUTH_TOKEN || undefined
}

// World type/package resolution lives in `mvr/worldTypes.ts`. Re-exported here
// so existing `utils/constants` importers keep working.
export {
  getObjectRegistryType,
  getWorldPackageId,
  getWorldTier,
  getWorldType,
} from './mvr/worldTypes'

// ============================================================================
// Constants
// ============================================================================

/** Default Sui network for GraphQL endpoint selection.
 *  @category Constants
 */
export const DEFAULT_GRAPHQL_NETWORK: SuiGraphqlNetwork = 'testnet'

/** Allowed Sui network identifiers for GraphQL endpoint selection.
 *  @category Constants
 */
export const SUI_GRAPHQL_NETWORKS = ['testnet', 'devnet', 'mainnet'] as const

/** Sui GraphQL query endpoints per network.
 *  @category Constants
 */
export const GRAPHQL_ENDPOINTS: Record<SuiGraphqlNetwork, string> = {
  testnet: 'https://graphql.testnet.sui.io/graphql',
  devnet: 'https://graphql.devnet.sui.io/graphql',
  mainnet: 'https://graphql.mainnet.sui.io/graphql',
}

/**
 * Client identifier sent as the `X-Client-ID` header on GraphQL requests.
 * Random per client, generated once and
 * cached for the module lifetime — used for session affinity during pagination.
 * @category Constants
 */
export const GRAPHQL_CLIENT_ID = globalThis.crypto.randomUUID()

/** Sui GraphQL subscription endpoints per network: SSE, on the same host as
 *  the query endpoint. See {@link getSuiGraphqlSubscriptionEndpoint}.
 *  @category Constants
 */
export const GRAPHQL_SUBSCRIPTION_ENDPOINTS: Record<SuiGraphqlNetwork, string> =
  {
    testnet: 'https://graphql.testnet.sui.io/graphql/subscriptions',
    devnet: 'https://graphql.devnet.sui.io/graphql/subscriptions',
    mainnet: 'https://graphql.mainnet.sui.io/graphql/subscriptions',
  }

/** gRPC base URLs for each Sui network.
 *  @category Constants
 */
export const SUI_GRPC_URLS: Record<SuiGraphqlNetwork, string> = {
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
}

/** Default polling interval in milliseconds.
 *
 * The update source with the `polling` transport, and the fallback when the
 * subscription fails. Each tick is a cheap version check until the object
 * changes. Override with VITE_POLLING_INTERVAL; set it to 0 to disable
 * polling entirely.
 *  @category Constants
 */
export const POLLING_INTERVAL = 15000

/** Read a non-negative millisecond interval from an env value, or `fallback`. */
function intervalFromEnv(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

/**
 * Resolve the polling interval in milliseconds.
 * Reads VITE_POLLING_INTERVAL when set (0 disables the backstop), otherwise
 * falls back to POLLING_INTERVAL.
 * @returns Interval in ms; 0 means the periodic poll is disabled.
 * @category Utilities - Config
 */
export function getPollingInterval(): number {
  return intervalFromEnv(
    import.meta.env.VITE_POLLING_INTERVAL,
    POLLING_INTERVAL,
  )
}

/**
 * How the selected entity is kept up to date:
 * - `subscription`: refetch when a GraphQL subscription delivers one of the
 *   entity's inventory or power events, with slow polling as a backstop;
 *   falls back to `polling` on its own if the subscription fails.
 * - `polling`: poll every {@link POLLING_INTERVAL} only.
 * @category Constants
 */
export type UpdateTransport = 'subscription' | 'polling'

/** The update transport when none is given. @category Constants */
export const DEFAULT_UPDATE_TRANSPORT: UpdateTransport = 'subscription'

/** Default backstop polling interval while the subscription is up, in ms.
 *  @category Constants
 */
export const SUBSCRIPTION_BACKSTOP_INTERVAL = 60_000

/** How long the subscription may take to connect before it counts as failed, in ms.
 *  @category Constants
 */
export const SUBSCRIPTION_CONNECT_TIMEOUT_MS = 10_000

/**
 * Resolve the backstop polling interval in ms while the subscription is up.
 * Reads VITE_SUBSCRIPTION_POLLING_INTERVAL when set (0 disables it), otherwise
 * SUBSCRIPTION_BACKSTOP_INTERVAL.
 * @category Utilities - Config
 */
export function getSubscriptionBackstopInterval(): number {
  return intervalFromEnv(
    import.meta.env.VITE_SUBSCRIPTION_POLLING_INTERVAL,
    SUBSCRIPTION_BACKSTOP_INTERVAL,
  )
}

/**
 * State of the entity subscription: `off` with the `polling` transport,
 * `connecting` until the first connect, `live` once connected, `failed` after
 * an error or a connect timeout.
 * @category Constants
 */
export type SubscriptionStatus = 'off' | 'connecting' | 'live' | 'failed'

/**
 * The polling interval to run: the slow backstop while the subscription is
 * connecting or live, the normal interval with `polling` or once the
 * subscription has failed.
 * @category Utilities - Config
 */
export function backstopInterval(
  transport: UpdateTransport,
  status: SubscriptionStatus,
): number {
  return transport === 'subscription' &&
    (status === 'connecting' || status === 'live')
    ? getSubscriptionBackstopInterval()
    : getPollingInterval()
}

/** Local storage keys.
 *  @category Constants
 */
export const STORAGE_KEYS = {
  CONNECTED: 'eve-dapp-connected',
} as const

/** Type IDs for in-game items.
 *  @category Constants
 */
export enum TYPEIDS {
  LENS = 77518,
  TRANSACTION_CHIP = 79193,
  COMMON_ORE = 77800,
  METAL_RICH_ORE = 77810,
  SMART_STORAGE_UNIT = 77917,
  PROTOCOL_DEPOT = 85249,
  GATEKEEPER = 83907,
  SALT = 83839,
  NETWORK_NODE = 88092,
  PORTABLE_REFINERY = 87161,
  PORTABLE_PRINTER = 87162,
  PORTABLE_STORAGE = 87566,
  REFUGE = 87160,
}

/** @category Constants */
export const EXCLUDED_TYPEIDS = [
  TYPEIDS.PORTABLE_REFINERY,
  TYPEIDS.PORTABLE_PRINTER,
  TYPEIDS.PORTABLE_STORAGE,
  TYPEIDS.REFUGE,
]

/** Per-tenant config: world tier, EVE token package ID (Sui) and Datahub API host.
 * @category Constants
 */
export type TenantConfig = (typeof TENANT_CONFIG)[TenantId]

/** Datahub API host per tenant (derived from TENANT_CONFIG).
 * @category Constants
 */
export const DATAHUB_BY_TENANT = Object.fromEntries(
  (Object.entries(TENANT_CONFIG) as [TenantId, TenantConfig][]).map(
    ([id, config]) => [id, config.datahubHost],
  ),
) as Record<TenantId, string>
