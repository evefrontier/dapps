import type {
  SponsoredTransactionArgs,
  SponsoredTransactionOutput,
} from "../wallet";
import { Assemblies } from "./types";

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
 * @category Wallet
 */
export const EVEFRONTIER_SPONSORED_TRANSACTION =
  "evefrontier:sponsoredTransaction" as const;

// ============================================================================
// Sponsored Transaction Types
// ============================================================================

/**
 * Map assembly types to API strings
 */
export const ASSEMBLY_TYPE_API_STRING: Record<Assemblies, string> = {
  [Assemblies.SmartStorageUnit]: "storage-units",
  [Assemblies.SmartTurret]: "turrets",
  [Assemblies.SmartGate]: "gates",
  [Assemblies.NetworkNode]: "network-nodes",
  [Assemblies.Assembly]: "assemblies",
} as const;

/** API slug for assembly type in sponsored transaction payloads (e.g. "storage-units"). */
export type SponsoredTransactionAssemblyType =
  (typeof ASSEMBLY_TYPE_API_STRING)[Assemblies];

export interface SponsoredTransactionMetadata {
  name?: string;
  description?: string;
  url?: string;
}
