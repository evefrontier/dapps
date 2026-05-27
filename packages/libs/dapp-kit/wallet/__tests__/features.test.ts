import type { Wallet } from "@mysten/wallet-standard";
import { describe, expect, it } from "vitest";
import {
  ASSEMBLY_TYPE_API_STRING,
  Assemblies,
  EVEFRONTIER_SPONSORED_TRANSACTION,
} from "../../types";
import {
  getAssemblyTypeApiString,
  hasSponsoredTransactionFeature,
  supportsSponsoredTransaction,
} from "../features";

// ============================================================================
// Shared test helpers
// ============================================================================

const SIGN_FN = async () => ({ digest: "0xtest" });

/** Wallet whose `features` is an object with the sponsored-tx implementation. */
function makeObjectWallet(signFn = SIGN_FN): Wallet {
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

// ============================================================================
// getAssemblyTypeApiString
// ============================================================================

describe("getAssemblyTypeApiString", () => {
  it.each(
    Object.entries(ASSEMBLY_TYPE_API_STRING) as [Assemblies, string][],
  )("%s → %s", (assemblyKey, expected) => {
    expect(getAssemblyTypeApiString(assemblyKey)).toBe(expected);
  });
});

// ============================================================================
// hasSponsoredTransactionFeature
// ============================================================================

describe("hasSponsoredTransactionFeature", () => {
  it("returns false when the feature key is missing entirely", () => {
    expect(hasSponsoredTransactionFeature({ other: "value" })).toBe(false);
  });

  it("returns false when the feature value is null", () => {
    expect(
      hasSponsoredTransactionFeature({
        [EVEFRONTIER_SPONSORED_TRANSACTION]: null,
      }),
    ).toBe(false);
  });

  it("returns false when signSponsoredTransaction method is missing", () => {
    expect(
      hasSponsoredTransactionFeature({
        [EVEFRONTIER_SPONSORED_TRANSACTION]: { version: "1.0.0" },
      }),
    ).toBe(false);
  });

  it("returns true for a valid feature object with signSponsoredTransaction", () => {
    expect(
      hasSponsoredTransactionFeature(
        makeObjectWallet().features as Record<string, unknown>,
      ),
    ).toBe(true);
  });
});

// ============================================================================
// supportsSponsoredTransaction
// ============================================================================

describe("supportsSponsoredTransaction", () => {
  it("returns false for null", () => {
    expect(supportsSponsoredTransaction(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(supportsSponsoredTransaction(undefined)).toBe(false);
  });

  it("returns false for an empty array", () => {
    expect(supportsSponsoredTransaction([])).toBe(false);
  });

  it("returns false for an array that does not contain the feature key", () => {
    expect(supportsSponsoredTransaction(["sui:signTransaction"])).toBe(false);
  });

  it("returns true for an array containing the feature key", () => {
    expect(
      supportsSponsoredTransaction([EVEFRONTIER_SPONSORED_TRANSACTION]),
    ).toBe(true);
  });

  it("returns true for object-shaped features with a valid implementation", () => {
    expect(
      supportsSponsoredTransaction(
        makeObjectWallet().features as Record<string, unknown>,
      ),
    ).toBe(true);
  });

  it("returns false for object-shaped features missing signSponsoredTransaction", () => {
    expect(
      supportsSponsoredTransaction({
        [EVEFRONTIER_SPONSORED_TRANSACTION]: { version: "1.0.0" },
      }),
    ).toBe(false);
  });
});
