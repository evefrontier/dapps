/**
 * EVE Frontier Wallet Standard Feature Extensions
 *
 * Custom wallet features for EVE Frontier dApps that extend the
 * standard Sui wallet capabilities.
 */

import { type SponsoredTransactionInput as WalletCoreSponsoredTransactionInput } from '@evefrontier/wallet-core/sponsored-transaction'
import {
  Assemblies,
  type AssemblyType,
  EVEFRONTIER_SPONSORED_TRANSACTION,
  SponsoredTransactionActions,
  type SponsoredTransactionMetadata,
} from '../types'

/**
 * Maps an assembly type enum to the API string expected by the sponsored transaction backend.
 *
 * @category Wallet
 * TODO: This typedoc is not working when re-exported from wallet-core
 */
export { getAssemblyTypeApiString } from '@evefrontier/wallet-core/sponsored-transaction'

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
  tenant: string
}

/** Sponsored tx args with assembly object; id and assemblyType are derived. Tenant is optional; the hook resolves it from args, URL query param, or default. */
export type SponsoredTransactionArgs = Omit<
  SponsoredTransactionInput,
  'assembly' | 'assemblyType' | 'account' | 'tenant'
> & {
  assembly: AssemblyType<Assemblies>
  account?: string
  tenant?: string
  txAction: SponsoredTransactionActions
  metadata?: SponsoredTransactionMetadata
}

// TODO: Add TypeDoc for SponsoredTransactionOutput, SponsoredTransactionMethod, and
// EveFrontierSponsoredTransactionFeature — either here once re-export doc support lands,
// or upstream in wallet-core.
export type {
  EveVaultWalletFeatures as EveFrontierSponsoredTransactionFeature,
  SponsoredTransactionMethod,
  SponsoredTransactionOutput,
} from '@evefrontier/wallet-core/wallet-standard-extensions'

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a wallet supports the sponsored transaction feature.
 * Supports array-shaped features like UIWallet object shape (list of feature names).
 *
 * @category Wallet
 */
export function supportsSponsoredTransaction(features: unknown): boolean {
  if (Array.isArray(features)) {
    return (features as string[]).includes(EVEFRONTIER_SPONSORED_TRANSACTION)
  }
  return false
}
