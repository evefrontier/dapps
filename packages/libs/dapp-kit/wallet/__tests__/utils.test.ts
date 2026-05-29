import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getSponsoredTransactionFeature,
  walletSupportsSponsoredTransaction,
} from "../utils";
import {
  makeArrayWallet,
  makeObjectWallet,
  makePlainWallet,
  SIGN_FN,
} from "./testHelpers";

vi.mock("@mysten/wallet-standard", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@mysten/wallet-standard")>();
  return { ...actual, getWallets: vi.fn() };
});

const { getWallets } = await import("@mysten/wallet-standard");

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
    vi.mocked(getWallets).mockReturnValue({
      get: () => [makeObjectWallet(SIGN_FN)],
      on: vi.fn() as never,
      register: vi.fn() as never,
    });
    expect(getSponsoredTransactionFeature(makeArrayWallet(SIGN_FN))).toBe(
      SIGN_FN,
    );
  });

  it("returns undefined for a wallet with no sponsored-tx feature", () => {
    expect(getSponsoredTransactionFeature(makePlainWallet())).toBeUndefined();
  });
});
