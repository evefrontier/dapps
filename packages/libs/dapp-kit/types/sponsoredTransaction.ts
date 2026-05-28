import type {
  SponsoredTransactionArgs,
  SponsoredTransactionOutput,
} from "../wallet";

/**
 * Available sponsored transaction actions
 *
 * @external SponsoredTransactionActions is defined in @evefrontier/wallet-core to ensure consistency between wallet and dapp-kit
 * @category Types
 *
 * TODO: This typedoc is not working when re-exported from wallet-core
 */
export { SponsoredTransactionActions } from "@evefrontier/wallet-core/definitions";

/** @category Types */
export type SendSponsoredTransactionFn = (
  input: SponsoredTransactionArgs,
  options?: {
    onSuccess?: (data: SponsoredTransactionOutput) => void;
    onError?: (error: Error) => void;
  },
) => Promise<SponsoredTransactionOutput>;

// ============================================================================
// Feature Identifiers
// ============================================================================

/**
 * Feature identifier for sponsored transactions.
 * Wallets implementing this feature can request gas sponsorship from
 * the EVE Frontier sponsored-transaction backend service.
 *
 * TODO: This typedoc is not working when re-exported from wallet-core
 * @category Wallet
 */
export {
  EVEFRONTIER_SPONSORED_TRANSACTION,
  type SponsoredTransactionMetadata,
} from "@evefrontier/wallet-core/wallet-standard-extensions";

// ============================================================================
// Sponsored Transaction Types
// ============================================================================

/**
 * Map assembly types to API strings
 *
 * TODO: This typedoc is not working when re-exported from wallet-core
 */
/** API slug for assembly type in sponsored transaction payloads (e.g. "storage-units").
 *
 * TODO: This typedoc is not working when re-exported from wallet-core
 */
export {
  ASSEMBLY_TYPE_API_STRING,
  type SponsoredTransactionAssemblyType,
} from "@evefrontier/wallet-core/definitions";
