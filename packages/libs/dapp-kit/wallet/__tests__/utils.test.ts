import type { Wallet } from "@mysten/wallet-standard";
import { describe, expect, it } from "vitest";
import { EVEFRONTIER_SPONSORED_TRANSACTION } from "../../types";
import type { SponsoredTransactionMethod } from "../features";
import {
  getSponsoredTransactionFeature,
  getSponsoredTransactionMethod,
  walletSupportsSponsoredTransaction,
} from "../utils";

// ============================================================================
// Shared test helpers
// ============================================================================

const SIGN_FN: SponsoredTransactionMethod = async () => ({ digest: "0xtest" });

/** Wallet whose `features` is an object implementing the sponsored-tx feature. */
function makeObjectWallet(
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

/**
 * Wallet whose `features` is an array of feature-name strings.
 * The actual implementation lives at the top-level wallet key (v2 pattern).
 */
function makeArrayWallet(name = "ArrayWallet"): Wallet {
  const wallet = {
    name,
    version: "1.0.0",
    icon: "data:image/png;base64,",
    chains: ["sui:testnet"],
    accounts: [],
    features: [EVEFRONTIER_SPONSORED_TRANSACTION],
    [EVEFRONTIER_SPONSORED_TRANSACTION]: {
      version: "1.0.0",
      signSponsoredTransaction: SIGN_FN,
    },
  };
  return wallet as unknown as Wallet;
}

/** Plain wallet with no sponsored-tx feature. */
function makePlainWallet(): Wallet {
  return {
    name: "PlainWallet",
    version: "1.0.0",
    icon: "data:image/png;base64,",
    chains: ["sui:testnet"],
    accounts: [],
    features: {},
  } as unknown as Wallet;
}

// ============================================================================
// walletSupportsSponsoredTransaction
// ============================================================================

describe("walletSupportsSponsoredTransaction", () => {
  it("returns true for an object-shaped-features wallet", () => {
    expect(walletSupportsSponsoredTransaction(makeObjectWallet())).toBe(true);
  });

  it("returns true for an array-shaped-features wallet", () => {
    expect(walletSupportsSponsoredTransaction(makeArrayWallet())).toBe(true);
  });

  it("returns false for a wallet with no sponsored-tx feature", () => {
    expect(walletSupportsSponsoredTransaction(makePlainWallet())).toBe(false);
  });
});

// ============================================================================
// getSponsoredTransactionFeature
// ============================================================================

describe("getSponsoredTransactionFeature", () => {
  it("returns the signSponsoredTransaction fn from an object-features wallet", () => {
    const wallet = makeObjectWallet(SIGN_FN);
    expect(getSponsoredTransactionFeature(wallet)).toBe(SIGN_FN);
  });

  it("returns undefined for a wallet with no sponsored-tx feature", () => {
    expect(getSponsoredTransactionFeature(makePlainWallet())).toBeUndefined();
  });

  it("returns undefined for an array-features wallet (feature not in features object)", () => {
    // Array-wallet features are not object-shaped, so getSponsoredTransactionFeature
    // returns undefined — getSponsoredTransactionMethod is used for array wallets.
    expect(getSponsoredTransactionFeature(makeArrayWallet())).toBeUndefined();
  });
});

// ============================================================================
// getSponsoredTransactionMethod
// ============================================================================

describe("getSponsoredTransactionMethod", () => {
  it("returns signSponsoredTransaction from object-shaped features", () => {
    const wallet = makeObjectWallet(SIGN_FN);
    expect(getSponsoredTransactionMethod(wallet)).toBe(SIGN_FN);
  });

  it("returns signSponsoredTransaction from top-level wallet key for array-shaped features", () => {
    const wallet = makeArrayWallet();
    const method = getSponsoredTransactionMethod(wallet);
    expect(method).toBe(SIGN_FN);
  });

  it("returns undefined when wallet has no sponsored-tx feature at all", () => {
    expect(getSponsoredTransactionMethod(makePlainWallet())).toBeUndefined();
  });
});
