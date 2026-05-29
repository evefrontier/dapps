import type { Wallet } from "@mysten/wallet-standard";
import { EVEFRONTIER_SPONSORED_TRANSACTION } from "../types";
import {
  type EveFrontierSponsoredTransactionFeature,
  hasSponsoredTransactionFeature,
  type SponsoredTransactionMethod,
  supportsSponsoredTransaction,
} from "./features";

/**
 * Check if a wallet supports the EVE Frontier sponsored transaction feature.
 *
 * Use this to filter available wallets to only those that can execute
 * sponsored (gasless) transactions. Currently, only EVE Vault implements
 * this feature.
 *
 * @category Wallet
 * @param wallet - The wallet object from wallet-standard
 * @returns True if the wallet implements the `evefrontier:sponsoredTransaction` feature
 *
 * @example Filter supported wallets
 * ```tsx
 * import { useWallets } from "@mysten/dapp-kit-react";
 * import { walletSupportsSponsoredTransaction } from "@evefrontier/dapp-kit";
 *
 * const wallets = useWallets();
 * const supportedWallets = wallets.filter(walletSupportsSponsoredTransaction);
 *
 * console.log(`${supportedWallets.length} wallets support sponsored transactions`);
 * ```
 *
 * @example Check single wallet
 * ```tsx
 * const { currentWallet } = useCurrentWallet();
 *
 * if (currentWallet && walletSupportsSponsoredTransaction(currentWallet)) {
 *   // Wallet supports gasless transactions
 * }
 * ```
 */
export function walletSupportsSponsoredTransaction(wallet: Wallet): boolean {
  return supportsSponsoredTransaction(wallet.features);
}

/**
 * Get the sponsored transaction method from a wallet if supported.
 *
 * Returns the raw `signSponsoredTransaction` method from the wallet's features.
 * For most use cases, prefer using the {@link useSponsoredTransaction} hook instead,
 * which provides React Query integration and automatic error handling.
 *
 * @category Wallet
 * @param wallet - The wallet object from wallet-standard
 * @returns The sponsored transaction method, or undefined if not supported
 *
 * @example Direct wallet feature access
 * ```tsx
 * const { currentWallet } = useCurrentWallet();
 *
 * if (currentWallet) {
 *   const sponsoredTx = getSponsoredTransactionFeature(currentWallet);
 *   if (sponsoredTx) {
 *     const result = await sponsoredTx({
 *       txAction: "online",
 *       chain: "sui:testnet",
 *       assembly: "0x123..."
 *     });
 *     console.log("Transaction digest:", result.digest);
 *   }
 * }
 * ```
 *
 * @see {@link useSponsoredTransaction} for the recommended React hook approach
 */
export function getSponsoredTransactionFeature(
  wallet: Wallet,
): SponsoredTransactionMethod | undefined {
  if (
    !hasSponsoredTransactionFeature(wallet.features as Record<string, unknown>)
  ) {
    return undefined;
  }

  const feature = (wallet.features as Record<string, unknown>)[
    EVEFRONTIER_SPONSORED_TRANSACTION
  ] as EveFrontierSponsoredTransactionFeature[typeof EVEFRONTIER_SPONSORED_TRANSACTION];

  return feature.signSponsoredTransaction;
}
