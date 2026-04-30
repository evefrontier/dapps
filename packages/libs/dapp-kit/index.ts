// Main provider

// =========================================
// Config
// =========================================
export { dAppKit } from "./config/dapp-kit";
// =========================================
// GraphQL - Query execution & helper functions
// =========================================
export * from "./graphql";
export type {
  UseSponsoredTransactionArgs,
  UseSponsoredTransactionError,
  UseSponsoredTransactionMutationOptions,
} from "./hooks";
// Hooks
// Hook error types and sponsored transaction types
export {
  useConnection,
  useNotification,
  useSmartObject,
  useSponsoredTransaction,
  WalletNoAccountSelectedError,
  WalletNotConnectedError,
  WalletSponsoredTransactionNotSupportedError,
} from "./hooks";
export {
  EveFrontierProvider,
  NotificationContext,
  NotificationProvider,
  SmartObjectContext,
  SmartObjectProvider,
  VaultContext,
  VaultProvider,
} from "./providers";
// =========================================
// Types (re-exported from ./types)
// =========================================
export * from "./types";
// =========================================
// Utils (re-exported from ./utils)
// =========================================
export * from "./utils";
export {
  getEnergyConfig,
  getEnergyUsageForType,
  getFuelEfficiencyConfig,
  getFuelEfficiencyForType,
} from "./utils/config";

// =========================================
// Constants & Configuration
// =========================================
export {
  getCharacterOwnerCapType,
  getEveWorldPackageId,
  getObjectRegistryType,
  getSuiGraphqlEndpoint,
  POLLING_INTERVAL,
  STORAGE_KEYS,
} from "./utils/constants";
export type {
  EveFrontierSponsoredTransactionFeature,
  SponsoredTransactionArgs,
  SponsoredTransactionInput,
  SponsoredTransactionMethod,
  SponsoredTransactionOutput,
} from "./wallet";
// =========================================
// Wallet Standard Extensions
// =========================================
export {
  getAssemblyTypeApiString,
  getSponsoredTransactionFeature,
  hasSponsoredTransactionFeature,
  walletSupportsSponsoredTransaction,
} from "./wallet";
