import { describe, expect, it } from "vitest";
import { Assemblies, EVEFRONTIER_SPONSORED_TRANSACTION } from "../../types";
import {
  getAssemblyTypeApiString,
  hasSponsoredTransactionFeature,
  supportsSponsoredTransaction,
} from "../features";
import { makeObjectWallet } from "./testHelpers";

// ============================================================================
// getAssemblyTypeApiString
// ============================================================================

describe("getAssemblyTypeApiString", () => {
  it.each([
    [Assemblies.SmartStorageUnit, "storage-units"],
    [Assemblies.SmartTurret, "turrets"],
    [Assemblies.SmartGate, "gates"],
    [Assemblies.NetworkNode, "network-nodes"],
    [Assemblies.Assembly, "assemblies"],
  ])("maps %s to API value %s", (assemblyKey, expected) => {
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

  it("returns false when signSponsoredTransaction is not a function", () => {
    expect(
      hasSponsoredTransactionFeature({
        [EVEFRONTIER_SPONSORED_TRANSACTION]: {
          version: "1.0.0",
          signSponsoredTransaction: "not-a-function",
        },
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

  it("returns false for object-shaped features with a non-function signSponsoredTransaction", () => {
    expect(
      supportsSponsoredTransaction({
        [EVEFRONTIER_SPONSORED_TRANSACTION]: {
          version: "1.0.0",
          signSponsoredTransaction: "not-a-function",
        },
      }),
    ).toBe(false);
  });
});
