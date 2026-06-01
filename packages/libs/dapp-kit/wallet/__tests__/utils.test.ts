import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSponsoredTransactionFeature,
  walletSupportsSponsoredTransaction,
} from "../utils";
import { makeArrayWallet, makePlainWallet, SIGN_FN } from "./testHelpers";

vi.mock("@wallet-standard/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@wallet-standard/ui")>();
  return { ...actual, getWalletFeature: vi.fn() };
});

const { getWalletFeature } = await import("@wallet-standard/ui");

// ============================================================================
// walletSupportsSponsoredTransaction
// ============================================================================

describe("walletSupportsSponsoredTransaction", () => {
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
  afterEach(() => vi.restoreAllMocks());

  it("returns the signSponsoredTransaction fn from an array-features wallet", () => {
    vi.mocked(getWalletFeature).mockReturnValue({
      version: "1.0.0",
      signSponsoredTransaction: SIGN_FN,
    });
    expect(getSponsoredTransactionFeature(makeArrayWallet())).toBe(SIGN_FN);
  });

  it("returns undefined for a wallet with no sponsored-tx feature", () => {
    expect(getSponsoredTransactionFeature(makePlainWallet())).toBeUndefined();
  });
});
