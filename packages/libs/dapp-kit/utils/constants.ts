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
 * Resolves against the active event transport: the `sse` transport uses the
 * subscription-capable ("cockroach") endpoint for its queries too, while `grpc`
 * (and the default) use the standard endpoint.
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
  const endpoints =
    activeEventTransport === 'sse'
      ? GRAPHQL_SUBSCRIPTION_ENDPOINTS
      : GRAPHQL_ENDPOINTS
  return endpoints[network]
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

/** Standard Sui GraphQL query endpoints per network. Used by the `grpc`
 *  transport (fullnode checkpoint stream + standard GraphQL queries).
 *  @category Constants
 */
export const GRAPHQL_ENDPOINTS: Record<SuiGraphqlNetwork, string> = {
  testnet: 'https://graphql.testnet.sui.io/graphql',
  devnet: 'https://graphql.devnet.sui.io/graphql',
  mainnet: 'https://graphql.mainnet.sui.io/graphql',
}

/** Subscription-capable ("cockroach") Sui GraphQL endpoints per network, used
 *  for queries when the `sse` transport is active. Only testnet has a known
 *  cockroach host; other networks fall back to the standard endpoint.
 *  @category Constants
 */
export const GRAPHQL_SUBSCRIPTION_ENDPOINTS: Record<SuiGraphqlNetwork, string> =
  {
    testnet: 'https://graphql-cockroach.testnet.sui.io/graphql',
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

/** gRPC base URLs for each Sui network.
 *  @category Constants
 */
export const SUI_GRPC_URLS: Record<SuiGraphqlNetwork, string> = {
  testnet: 'https://fullnode.testnet.sui.io:443',
  devnet: 'https://fullnode.devnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
}

/**
 * Event transport, which selects the GraphQL query endpoint.
 * - `grpc`: the standard endpoint.
 * - `sse`: the subscription-capable ("cockroach") endpoint.
 * Selected per-app via the `eventTransport` provider prop (typically driven by
 * a feature flag). Defaults to `grpc`.
 * @category Types
 */
export type EventTransport = 'grpc' | 'sse'

/** Default event transport when none is provided. @category Constants */
export const DEFAULT_EVENT_TRANSPORT: EventTransport = 'grpc'

// Active transport (single writer: SmartObjectProvider). Lets the query
// endpoint follow it — grpc → standard, sse → cockroach — without threading
// `transport` through every query helper.
let activeEventTransport: EventTransport = DEFAULT_EVENT_TRANSPORT

/** Set the transport that governs which GraphQL query endpoint is used.
 *  @category Utilities - Config */
export function setActiveEventTransport(transport: EventTransport): void {
  activeEventTransport = transport
}

/** Default polling interval in milliseconds.
 *
 * Polling is the only source of updates for the selected entity; each tick is
 * a cheap version check until the object changes. Override with
 * VITE_POLLING_INTERVAL; set it to 0 to disable polling entirely.
 *  @category Constants
 */
export const POLLING_INTERVAL = 15000

/**
 * Resolve the polling-backstop interval in milliseconds.
 * Reads VITE_POLLING_INTERVAL when set (0 disables the backstop), otherwise
 * falls back to POLLING_INTERVAL.
 * @returns Interval in ms; 0 means the periodic poll is disabled.
 * @category Utilities - Config
 */
export function getPollingInterval(): number {
  const raw = import.meta.env.VITE_POLLING_INTERVAL
  if (raw === undefined || raw === '') return POLLING_INTERVAL
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : POLLING_INTERVAL
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
