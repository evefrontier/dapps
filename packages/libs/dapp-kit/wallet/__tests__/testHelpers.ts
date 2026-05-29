import type { Wallet } from "@mysten/wallet-standard";
import { EVEFRONTIER_SPONSORED_TRANSACTION } from "../../types";
import type { SponsoredTransactionMethod } from "../features";

export const SIGN_FN: SponsoredTransactionMethod = async () => ({
  digest: "0xtest",
  effects: "0xeffects",
});

/** Wallet whose `features` is an object implementing the sponsored-tx feature. */
export function makeObjectWallet(
  signFn: SponsoredTransactionMethod = SIGN_FN,
): Wallet {
  return {
    name: "EVE Vault",
    version: "1.0.0",
    icon: "data:image/png;base64,",
    chains: ["sui:testnet"],
    accounts: [],
    features: {
      [EVEFRONTIER_SPONSORED_TRANSACTION]: {
        version: "1.0.0" as const,
        signSponsoredTransaction: signFn,
      },
    },
  } as unknown as Wallet;
}

/** Wallet whose `features` is an array of feature name strings (UiWallet shape). */
export function makeArrayWallet(
  signFn: SponsoredTransactionMethod = SIGN_FN,
): Wallet {
  void signFn;
  return {
    name: "EVE Vault",
    version: "1.0.0",
    icon: "data:image/png;base64,",
    chains: ["sui:testnet"],
    accounts: [],
    features: [EVEFRONTIER_SPONSORED_TRANSACTION],
  } as unknown as Wallet;
}

/** Plain wallet with no sponsored-tx feature. */
export function makePlainWallet(): Wallet {
  return {
    name: "PlainWallet",
    version: "1.0.0",
    icon: "data:image/png;base64,",
    chains: ["sui:testnet"],
    accounts: [],
    features: {},
  } as unknown as Wallet;
}
