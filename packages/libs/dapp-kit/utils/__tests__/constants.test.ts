import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GRAPHQL_ENDPOINTS,
  getCharacterOwnerCapType,
  getCharacterPlayerProfileType,
  getEnergyConfigType,
  getEveCoinType,
  getEveWorldPackageId,
  getFuelEfficiencyConfigType,
  getObjectRegistryType,
  getSuiGraphqlEndpoint,
  KNOWN_EVE_COIN_TYPES,
  TenantId,
} from "../constants";

const TEST_PKG =
  "0x2ff3e06b96eb830bdcffbc6cae9b8fe43f005c3b94cef05d9ec23057df16f107";

describe("constants", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_EVE_WORLD_PACKAGE_ID", TEST_PKG);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ============================================================================
  // getSuiGraphqlEndpoint
  // ============================================================================

  describe("getSuiGraphqlEndpoint", () => {
    it("returns testnet URL for 'testnet'", () => {
      expect(getSuiGraphqlEndpoint("testnet")).toBe(
        GRAPHQL_ENDPOINTS["testnet"],
      );
    });

    it("returns devnet URL for 'devnet'", () => {
      expect(getSuiGraphqlEndpoint("devnet")).toBe(GRAPHQL_ENDPOINTS["devnet"]);
    });

    it("returns mainnet URL for 'mainnet'", () => {
      expect(getSuiGraphqlEndpoint("mainnet")).toBe(
        GRAPHQL_ENDPOINTS["mainnet"],
      );
    });

    it("defaults to testnet URL when called with no argument", () => {
      expect(getSuiGraphqlEndpoint()).toBe(GRAPHQL_ENDPOINTS["testnet"]);
    });

    it("falls back to testnet URL for an unknown network string", () => {
      expect(getSuiGraphqlEndpoint("unknown-net")).toBe(
        GRAPHQL_ENDPOINTS["testnet"],
      );
    });
  });

  // ============================================================================
  // getEveWorldPackageId
  // ============================================================================

  describe("getEveWorldPackageId", () => {
    it("returns the VITE_EVE_WORLD_PACKAGE_ID env var value", () => {
      expect(getEveWorldPackageId()).toBe(TEST_PKG);
    });

    it("throws a helpful error when the env var is unset", () => {
      vi.unstubAllEnvs();
      expect(() => getEveWorldPackageId()).toThrow(
        "Missing required environment variable: VITE_EVE_WORLD_PACKAGE_ID",
      );
    });
  });

  // ============================================================================
  // Type string generators
  // ============================================================================

  describe("getCharacterOwnerCapType", () => {
    it("returns the correct type string format", () => {
      expect(getCharacterOwnerCapType()).toBe(
        `${TEST_PKG}::access::OwnerCap<${TEST_PKG}::character::Character>`,
      );
    });
  });

  describe("getCharacterPlayerProfileType", () => {
    it("returns the correct type string format", () => {
      expect(getCharacterPlayerProfileType()).toBe(
        `${TEST_PKG}::character::PlayerProfile`,
      );
    });
  });

  describe("getObjectRegistryType", () => {
    it("returns the correct type string format", () => {
      expect(getObjectRegistryType()).toBe(
        `${TEST_PKG}::object_registry::ObjectRegistry`,
      );
    });
  });

  describe("getEnergyConfigType", () => {
    it("returns the correct type string format", () => {
      expect(getEnergyConfigType()).toBe(`${TEST_PKG}::energy::EnergyConfig`);
    });
  });

  describe("getFuelEfficiencyConfigType", () => {
    it("returns the correct type string format", () => {
      expect(getFuelEfficiencyConfigType()).toBe(
        `${TEST_PKG}::fuel::FuelConfig`,
      );
    });
  });

  // ============================================================================
  // getEveCoinType
  // ============================================================================

  describe("getEveCoinType", () => {
    it.each(
      Object.values(TenantId) as TenantId[],
    )("returns a valid EVE coin type for tenant %s", (tenantId) => {
      const coinType = getEveCoinType(tenantId);
      expect(coinType).toMatch(/^0x[0-9a-f]+::EVE::EVE$/);
    });
  });

  // ============================================================================
  // KNOWN_EVE_COIN_TYPES
  // ============================================================================

  describe("KNOWN_EVE_COIN_TYPES", () => {
    it("contains the coin type for every TenantId", () => {
      for (const tenantId of Object.values(TenantId) as TenantId[]) {
        expect(KNOWN_EVE_COIN_TYPES.has(getEveCoinType(tenantId))).toBe(true);
      }
    });

    it("does not contain an arbitrary coin type string", () => {
      expect(KNOWN_EVE_COIN_TYPES.has("0x0000000000::EVE::EVE")).toBe(false);
    });
  });
});
