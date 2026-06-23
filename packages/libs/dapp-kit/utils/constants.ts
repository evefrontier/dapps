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
  TENANT_CONFIG,
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
 * Get the Sui GraphQL endpoint URL for the given network.
 * Unknown values fall back to testnet to avoid returning undefined.
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
 * Get the EVE World package ID from environment.
 * @returns The package ID (0x-prefixed address)
 * @throws {Error} If VITE_EVE_WORLD_PACKAGE_ID is not set
 * @category Utilities - Config
 */
export const getEveWorldPackageId = (): string =>
  getEnvVar('VITE_EVE_WORLD_PACKAGE_ID')

/** Type string for Character OwnerCap from the EVE World package. @category Utilities - Config */
export const getCharacterOwnerCapType = (): string => {
  const pkg = getEveWorldPackageId()
  return `${pkg}::access::OwnerCap<${pkg}::character::Character>`
}

/** Type string for Character PlayerProfile from the EVE World package. @category Utilities - Config */
export const getCharacterPlayerProfileType = (): string => {
  const pkg = getEveWorldPackageId()
  return `${pkg}::character::PlayerProfile`
}

/** Type string for ObjectRegistry from the EVE World package. @category Utilities - Config */
export const getObjectRegistryType = (): string =>
  `${getEveWorldPackageId()}::object_registry::ObjectRegistry`

/** Type string for EnergyConfig from the EVE World package. @category Utilities - Config */
export const getEnergyConfigType = (): string =>
  `${getEveWorldPackageId()}::energy::EnergyConfig`

/** Type string for FuelConfig from the EVE World package. @category Utilities - Config */
export const getFuelEfficiencyConfigType = (): string =>
  `${getEveWorldPackageId()}::fuel::FuelConfig`

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

/** GraphQL endpoint URLs for each Sui network.
 *  @category Constants
 */
export const GRAPHQL_ENDPOINTS: Record<SuiGraphqlNetwork, string> = {
  testnet: 'https://graphql.testnet.sui.io/graphql',
  devnet: 'https://graphql.devnet.sui.io/graphql',
  mainnet: 'https://graphql.mainnet.sui.io/graphql',
}

/** Polling interval in milliseconds (10 seconds).
 *  @category Constants
 */
export const POLLING_INTERVAL = 10000

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
