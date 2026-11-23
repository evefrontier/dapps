// Main provider

// =========================================
// Config
// =========================================
export { dAppKit } from './config/dapp-kit'
// =========================================
// GraphQL - Query execution & helper functions
// =========================================
export * from './graphql'
export type {
  UseSponsoredTransactionArgs,
  UseSponsoredTransactionError,
  UseSponsoredTransactionMutationOptions,
} from './hooks'
// Hooks
// Hook error types and sponsored transaction types
export {
  useCharacterDirectory,
  useConnection,
  useEntityRole,
  useNotification,
  useSmartObject,
  useSponsoredTransaction,
  useTypeNames,
  WalletNoAccountSelectedError,
  WalletNotConnectedError,
  WalletSponsoredTransactionNotSupportedError,
} from './hooks'
export {
  EveFrontierProvider,
  NotificationContext,
  NotificationProvider,
  SmartObjectContext,
  SmartObjectProvider,
  VaultContext,
  VaultProvider,
} from './providers'
// =========================================
// Types (re-exported from ./types)
// =========================================
export * from './types'
// =========================================
// Utils (re-exported from ./utils)
// =========================================
export * from './utils'

// =========================================
// Constants & Configuration
// =========================================
export {
  DEFAULT_EVENT_TRANSPORT,
  type EventTransport,
  getObjectRegistryType,
  getPollingInterval,
  getSuiGraphqlEndpoint,
  getWorldPackageId,
  getWorldTier,
  getWorldType,
  POLLING_INTERVAL,
  STORAGE_KEYS,
} from './utils/constants'
export type {
  EveFrontierSponsoredTransactionFeature,
  SponsoredTransactionArgs,
  SponsoredTransactionInput,
  SponsoredTransactionMethod,
  SponsoredTransactionOutput,
} from './wallet'
// =========================================
// Wallet Standard Extensions
// =========================================
export {
  getAssemblyTypeApiString,
  getSponsoredTransactionFeature,
  walletSupportsSponsoredTransaction,
} from './wallet'
