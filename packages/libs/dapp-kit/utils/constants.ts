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
} from '@evefrontier/wallet-core/tenant'

/**
 * Get a required environment variable, throwing if not set.
 * @param name - The environment variable name (e.g., "VITE_SUI_GRAPHQL_ENDPOINT")
 * @throws {Error} If the environment variable is not set
 */
function getEnvVar(name: string): string {
  const value = import.meta.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Please set it in your .env file.`,
    )
  }
  return value
}

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

/**
 * Raw `VITE_EVE_WORLD_PACKAGE_ID` value. May be either a 0x address or an MVR
 * name such as `@evefrontier/world-test`.
 * @throws {Error} If VITE_EVE_WORLD_PACKAGE_ID is not set
 * @category Utilities - Config
 */
export const getEveWorldPackageRef = (): string =>
  getEnvVar('VITE_EVE_WORLD_PACKAGE_ID')

/** Matches a 0x-prefixed hex Sui address. @category Utilities - Config */
export const HEX_ADDRESS = /^0x[0-9a-fA-F]+$/

// World type/package resolution lives in `mvr/worldTypes.ts` (it depends on the
// generated MVR snapshot). Re-exported here so existing `utils/constants`
// importers keep working. The cycle constants → worldTypes → constants is safe:
// worldTypes only reads `HEX_ADDRESS`/`getEveWorldPackageRef` inside function
// bodies, never at module-eval time.
export {
  getCharacterOwnerCapType,
  getCharacterPlayerProfileType,
  getEnergyConfigType,
  getEveWorldPackageId,
  getFuelEfficiencyConfigType,
  getObjectRegistryType,
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

/** Subscription-capable ("cockroach") Sui GraphQL endpoints per network. Used
 *  by the `sse` transport for BOTH its queries and its SSE subscription, since
 *  only this endpoint serves GraphQL subscriptions. Only testnet has a known
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
 * Client identifier sent as the `X-Client-ID` header on GraphQL requests
 * (query fetch and the SSE subscription). Random per client, generated once and
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
 * Get the Sui gRPC base URL for the given network.
 * Unknown values fall back to testnet.
 * @category Utilities
 */
export function getSuiGrpcBaseUrl(
  env: string = DEFAULT_GRAPHQL_NETWORK,
): string {
  const network = isSuiGraphqlNetwork(env) ? env : DEFAULT_GRAPHQL_NETWORK
  return SUI_GRPC_URLS[network]
}

/**
 * Real-time event transport feeding optimistic updates.
 * - `grpc`: Sui fullnode gRPC checkpoint stream.
 * - `sse`: GraphQL subscription over SSE.
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

/** The transport currently governing GraphQL endpoint selection.
 *  @category Utilities - Config */
export function getActiveEventTransport(): EventTransport {
  return activeEventTransport
}

/**
 * HTTP(S) URL of the GraphQL subscription endpoint (SSE / graphql-sse) — the
 * real-time event source for optimistic updates. Sui serves subscriptions on a
 * dedicated `/subscriptions` path appended to the query endpoint.
 * @returns The subscription endpoint URL.
 * @category Utilities - Config
 */
export function getGraphqlSubscriptionEndpoint(
  env: string = DEFAULT_GRAPHQL_NETWORK,
): string {
  const network = isSuiGraphqlNetwork(env) ? env : DEFAULT_GRAPHQL_NETWORK
  return `${GRAPHQL_SUBSCRIPTION_ENDPOINTS[network]}/subscriptions`
}

/**
 * Optional bearer token sent as an Authorization header on the SSE subscription
 * when the endpoint requires authentication. Configured via
 * VITE_GRAPHQL_SUBSCRIPTION_AUTH_TOKEN. Returns undefined when unset.
 * @category Utilities - Config
 */
export function getGraphqlSubscriptionAuthToken(): string | undefined {
  const token = import.meta.env.VITE_GRAPHQL_SUBSCRIPTION_AUTH_TOKEN
  return typeof token === 'string' && token.length > 0 ? token : undefined
}

/** Default polling interval in milliseconds.
 *
 * Real-time updates come from the event subscription; this interval is only a
 * slow backstop that catches state changes not covered by a tracked event (or
 * an event the endpoint silently never sent). Override with VITE_POLLING_INTERVAL;
 * set it to 0 to disable the backstop entirely.
 *  @category Constants
 */
export const POLLING_INTERVAL = 60000

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

/** Per-tenant config: EVE token package ID (Sui) and Datahub API host. v0.0.18
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
