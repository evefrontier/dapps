import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  abbreviateAddress,
  isOwner,
  getTxUrl,
  parseURL,
  clickToCopy,
  getCommonItems,
  removeTrailingZeros,
  getEnv,
  getVolumeM3,
  formatM3,
  getDappUrl,
  findOwnerByAddress,
  assertAssemblyType,
  formatDuration,
} from "../utils";
import { Assemblies } from "../../types";

describe("abbreviateAddress", () => {
  it("returns empty string for undefined or empty input", () => {
    expect(abbreviateAddress()).toBe("");
    expect(abbreviateAddress("")).toBe("");
  });

  it("abbreviates long address with default precision (5)", () => {
    expect(abbreviateAddress("0x1234567890abcdef1234567890abcdef")).toBe(
      "0x123...bcdef",
    );
  });

  it("abbreviates with custom precision", () => {
    expect(abbreviateAddress("0x1234567890abcdef", 3)).toBe("0x1...def");
  });

  it("returns full string when expanded is true", () => {
    const addr = "0x1234567890abcdef";
    expect(abbreviateAddress(addr, 5, true)).toBe(addr);
  });

  it("returns string as-is when length <= precision * 2", () => {
    expect(abbreviateAddress("0x12345", 5)).toBe("0x12345");
  });
});

describe("isOwner", () => {
  it("returns false when assembly is null", () => {
    expect(isOwner(null, "0xabc")).toBe(false);
  });

  it("returns false when assembly has no character address", () => {
    expect(isOwner({} as any, "0xabc")).toBe(false);
    expect(isOwner({ character: {} } as any, "0xabc")).toBe(false);
  });

  it("returns false when account is 0x", () => {
    expect(
      isOwner({ character: { address: "0xabc" } } as any, "0x"),
    ).toBe(false);
  });

  it("returns true when character address matches account", () => {
    expect(
      isOwner({ character: { address: "0xabc" } } as any, "0xabc"),
    ).toBe(true);
    expect(
      isOwner({ character: { address: "0xdef" } } as any, "0xdef"),
    ).toBe(true);
  });

  it("returns false when character address does not match account", () => {
    expect(
      isOwner({ character: { address: "0xabc" } } as any, "0xdef"),
    ).toBe(false);
  });

  it("treats undefined account as empty string (no match unless address is empty)", () => {
    expect(
      isOwner({ character: { address: "0xabc" } } as any, undefined),
    ).toBe(false);
  });
});

describe("getTxUrl", () => {
  it("builds Suiscan URL for testnet", () => {
    expect(getTxUrl("sui:testnet", "ABC123")).toBe(
      "https://suiscan.xyz/testnet/tx/ABC123",
    );
  });

  it("builds Suiscan URL for mainnet", () => {
    expect(getTxUrl("sui:mainnet", "xyz789")).toBe(
      "https://suiscan.xyz/mainnet/tx/xyz789",
    );
  });
});

describe("parseURL", () => {
  it("strips https:// and returns the rest", () => {
    expect(parseURL("https://example.com/path")).toBe("example.com/path");
  });

  it("strips http:// and returns the rest", () => {
    expect(parseURL("http://foo.bar")).toBe("foo.bar");
  });

  it("returns string unchanged when no protocol", () => {
    expect(parseURL("example.com")).toBe("example.com");
  });
});

describe("clickToCopy", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls navigator.clipboard.writeText with the given string", async () => {
    await clickToCopy("hello");
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello");
  });
});

describe("getCommonItems", () => {
  it("returns empty array when either array is empty", () => {
    expect(getCommonItems([], [1, 2])).toEqual([]);
    expect(getCommonItems([1, 2], [])).toEqual([]);
  });

  it("returns common elements", () => {
    expect(getCommonItems([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
  });

  it("includes duplicates from second array when they appear in first", () => {
    expect(getCommonItems([1, 1, 2], [1, 2, 2])).toEqual([1, 2, 2]);
  });

  it("works with string arrays", () => {
    expect(getCommonItems(["a", "b"], ["b", "c"])).toEqual(["b"]);
  });
});

describe("removeTrailingZeros", () => {
  it("removes trailing zeros after last significant decimal", () => {
    expect(removeTrailingZeros("1.23000")).toBe("1.23");
    expect(removeTrailingZeros("1.100")).toBe("1.1");
  });

  it("removes trailing decimal zeros only", () => {
    expect(removeTrailingZeros("1.23400")).toBe("1.234");
  });

  it("handles integer-like string", () => {
    expect(removeTrailingZeros("1.0")).toBe("1");
  });
});

describe("getEnv", () => {
  it("returns env value when truthy", () => {
    expect(getEnv("value", "fallback")).toBe("value");
  });

  it("returns fallback when env is empty string", () => {
    expect(getEnv("", "fallback")).toBe("fallback");
  });
});

describe("getVolumeM3", () => {
  it("computes volume from quantity and volume per unit", () => {
    expect(getVolumeM3(10n, 1000n)).toBe(10000);
  });

  it("handles single unit", () => {
    expect(getVolumeM3(1n, 500n)).toBe(500);
  });
});

describe("formatM3", () => {
  it("converts litres (1000) to 1 m³", () => {
    expect(formatM3(1000)).toBe(1);
    expect(formatM3(BigInt("1000"))).toBe(1);
  });

  it("converts string input", () => {
    expect(formatM3("2500")).toBe(2.5);
  });
});

describe("getDappUrl", () => {
  it("returns empty string when assembly has no dappURL", () => {
    expect(getDappUrl(null as any)).toBe("");
    expect(getDappUrl({} as any)).toBe("");
    expect(getDappUrl({ dappURL: undefined } as any)).toBe("");
  });

  it("returns dappURL as-is when it has protocol", () => {
    expect(
      getDappUrl({ dappURL: "https://example.com" } as any),
    ).toBe("https://example.com");
    expect(
      getDappUrl({ dappURL: "http://foo.bar" } as any),
    ).toBe("http://foo.bar");
  });

  it("adds https:// when dappURL has no protocol", () => {
    expect(getDappUrl({ dappURL: "example.com" } as any)).toBe(
      "https://example.com",
    );
  });
});

describe("findOwnerByAddress", () => {
  it("returns false when either address is missing or empty", () => {
    expect(findOwnerByAddress(undefined, "0xabc")).toBe(false);
    expect(findOwnerByAddress("0xabc", undefined)).toBe(false);
    expect(findOwnerByAddress("", "0xabc")).toBe(false);
    expect(findOwnerByAddress("0xabc", "")).toBe(false);
  });

  it("returns true when addresses match", () => {
    expect(findOwnerByAddress("0xabc", "0xabc")).toBe(true);
  });

  it("returns false when addresses differ", () => {
    expect(findOwnerByAddress("0xabc", "0xdef")).toBe(false);
  });
});

describe("assertAssemblyType", () => {
  it("returns false when assembly is null", () => {
    expect(assertAssemblyType(null, Assemblies.SmartStorageUnit)).toBe(false);
  });

  it("returns false when assembly has no type", () => {
    expect(assertAssemblyType({} as any, Assemblies.SmartStorageUnit)).toBe(
      false,
    );
  });

  it("returns true when assembly type matches", () => {
    expect(
      assertAssemblyType(
        { type: Assemblies.SmartStorageUnit } as any,
        Assemblies.SmartStorageUnit,
      ),
    ).toBe(true);
  });

  it("returns false when assembly type does not match", () => {
    expect(
      assertAssemblyType(
        { type: Assemblies.SmartGate } as any,
        Assemblies.SmartStorageUnit,
      ),
    ).toBe(false);
  });
});

describe("formatDuration", () => {
  it("returns 0m 0s for zero", () => {
    expect(formatDuration(0)).toBe("0m 0s");
  });

  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("01m 30s");
  });

  it("formats hours, minutes, seconds", () => {
    expect(formatDuration(3665)).toBe("01h 01m 05s");
  });

  it("formats days, hours, minutes, seconds", () => {
    expect(formatDuration(90061)).toBe("01d 01h 01m 01s");
  });
});
