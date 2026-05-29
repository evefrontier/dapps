import { describe, expect, it } from "vitest";
import {
  getSponsoredTransactionFeature,
  walletSupportsSponsoredTransaction,
} from "../utils";
import { makeObjectWallet, makePlainWallet, SIGN_FN } from "./testHelpers";

// ============================================================================
// walletSupportsSponsoredTransaction
// ============================================================================

describe("walletSupportsSponsoredTransaction", () => {
  it("returns true for an object-shaped-features wallet", () => {
    expect(walletSupportsSponsoredTransaction(makeObjectWallet())).toBe(true);
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
});
