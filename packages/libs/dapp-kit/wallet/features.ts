/**
 * EVE Frontier Wallet Standard Feature Extensions
 *
 * Custom wallet features for EVE Frontier dApps that extend the
 * standard Sui wallet capabilities.
 */

import {
  type EveVaultWalletFeatures as EveFrontierSponsoredTransactionFeature,
  type SponsoredTransactionInput as WalletCoreSponsoredTransactionInput,
} from "@evefrontier/wallet-core/wallet-standard-extensions";
import {
  Assemblies,
  type AssemblyType,
  EVEFRONTIER_SPONSORED_TRANSACTION,
  SponsoredTransactionActions,
  type SponsoredTransactionMetadata,
} from "../types";

/**
 * Maps an assembly type enum to the API string expected by the sponsored transaction backend.
 *
 * @category Wallet
 * TODO: This typedoc is not working when re-exported from wallet-core
 */
export { getAssemblyTypeApiString } from "@evefrontier/wallet-core/definitions";

/**
 * Input for a sponsored transaction request
 * Takes the transformed item_id and assembly type values of the assembly object
 * Normalization from assembly object to this flat shape is done in the hook by design;
 * callers may pass either the full assembly or pre-flattened values.
 *
 * TODO: This typedoc is not working when re-exported from wallet-core
 * Migrate either wallet-core or dapp-kit to use the same shape for sponsored transaction input.
 * @category Types
 */
export type SponsoredTransactionInput = WalletCoreSponsoredTransactionInput & {
  tenant: string;
};

/** Sponsored tx args with assembly object; id and assemblyType are derived. Tenant is optional; the hook resolves it from args, URL query param, or default. */
export type SponsoredTransactionArgs = Omit<
  SponsoredTransactionInput,
  "assembly" | "assemblyType" | "account" | "tenant"
> & {
  assembly: AssemblyType<Assemblies>;
  account?: string;
  tenant?: string;
  txAction: SponsoredTransactionActions;
  metadata?: SponsoredTransactionMetadata;
};

/**
 * Output from a successful sponsored transaction
 *
 * TODO: This typedoc is not working when re-exported from wallet-core
 * @category Types
 */
/**
 * The sponsored transaction method signature
 *
 * TODO: This typedoc is not working when re-exported from wallet-core
 * @category Wallet
 */
/**
 * Feature interface for sponsored transactions.
 * Wallets that support this feature should implement this interface
 * in their `features` object.
 *
 * TODO: This typedoc is not working when re-exported from wallet-core
 * @category Wallet
 */
export type {
  EveVaultWalletFeatures as EveFrontierSponsoredTransactionFeature,
  SponsoredTransactionMethod,
  SponsoredTransactionOutput,
} from "@evefrontier/wallet-core/wallet-standard-extensions";

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an object has the sponsored transaction feature
 * (object form with implementation).
 *
 * @category Wallet
 */
export function hasSponsoredTransactionFeature(
  features: Record<string, unknown>,
): features is Record<string, unknown> &
  EveFrontierSponsoredTransactionFeature {
  const featureValue = features[EVEFRONTIER_SPONSORED_TRANSACTION];
  return (
    EVEFRONTIER_SPONSORED_TRANSACTION in features &&
    typeof featureValue === "object" &&
    featureValue !== null &&
    "signSponsoredTransaction" in (featureValue as object)
  );
}

/**
 * Check if a wallet supports the sponsored transaction feature.
 * Supports both legacy object-shaped features and v2 array-shaped features
 * (list of feature names).
 *
 * @category Wallet
 */
export function supportsSponsoredTransaction(features: unknown): boolean {
  if (Array.isArray(features)) {
    return (features as string[]).includes(EVEFRONTIER_SPONSORED_TRANSACTION);
  }
  if (typeof features === "object" && features !== null) {
    return hasSponsoredTransactionFeature(features as Record<string, unknown>);
  }
  return false;
}
