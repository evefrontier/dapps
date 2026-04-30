/**
 * EVE Frontier Wallet Standard Extensions
 *
 * Provides custom wallet sponsored transaction features.
 */

export type {
  EveFrontierSponsoredTransactionFeature,
  SponsoredTransactionArgs,
  SponsoredTransactionInput,
  SponsoredTransactionMethod,
  SponsoredTransactionOutput,
} from "./features";
// Feature definitions and types
export {
  getAssemblyTypeApiString,
  hasSponsoredTransactionFeature,
  supportsSponsoredTransaction,
} from "./features";

// Utility functions
export {
  getSponsoredTransactionFeature,
  getSponsoredTransactionMethod,
  walletSupportsSponsoredTransaction,
} from "./utils";
