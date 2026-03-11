import { describe, expect, it } from "vitest";
import {
  resolveTenantFromSearch,
  resolveDatahubHost,
  datahubUrls,
} from "../datahub";
import { DEFAULT_TENANT } from "../constants";
import { QueryParams } from "../../types";

const DEFAULT_HOST = datahubUrls[DEFAULT_TENANT as keyof typeof datahubUrls];

describe("resolveTenantFromSearch (tenant resolution)", () => {
  it("returns DEFAULT_TENANT when search is empty", () => {
    expect(resolveTenantFromSearch("")).toBe(DEFAULT_TENANT);
  });

  it("returns DEFAULT_TENANT when tenant param is missing", () => {
    expect(resolveTenantFromSearch("?itemId=123")).toBe(DEFAULT_TENANT);
  });

  it("returns DEFAULT_TENANT when tenant param is blank (?tenant=)", () => {
    expect(resolveTenantFromSearch("?tenant=")).toBe(DEFAULT_TENANT);
  });

  it("trims tenant value (surrounding spaces)", () => {
    expect(resolveTenantFromSearch("?tenant=  stillness  ")).toBe("stillness");
    expect(resolveTenantFromSearch("?tenant=nebula  ")).toBe("nebula");
  });

  it("returns trimmed known tenant from param", () => {
    expect(resolveTenantFromSearch(`?${QueryParams.TENANT}=nebula`)).toBe(
      "nebula",
    );
    expect(resolveTenantFromSearch(`?${QueryParams.TENANT}=utopia`)).toBe(
      "utopia",
    );
  });
});

describe("resolveDatahubHost (host fallback)", () => {
  it("returns DEFAULT_TENANT host for unknown tenant", () => {
    expect(resolveDatahubHost("unknown-tenant")).toBe(DEFAULT_HOST);
    expect(resolveDatahubHost("")).toBe(DEFAULT_HOST);
  });

  it("returns known host for valid tenant keys", () => {
    expect(resolveDatahubHost("stillness")).toBe(datahubUrls.stillness);
    expect(resolveDatahubHost("nebula")).toBe(datahubUrls.nebula);
    expect(resolveDatahubHost("utopia")).toBe(datahubUrls.utopia);
    expect(resolveDatahubHost("testevenet")).toBe(datahubUrls.testevenet);
  });
});
