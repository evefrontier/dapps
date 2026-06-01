import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  executeGraphQLQuery,
  getAssemblyWithOwner,
  getObjectWithDynamicFields,
  getObjectWithJson,
} from "../client";
import {
  GET_OBJECT_WITH_DYNAMIC_FIELDS,
  GET_OBJECT_WITH_JSON,
} from "../queries";

const TEST_PKG =
  "0x2ff3e06b96eb830bdcffbc6cae9b8fe43f005c3b94cef05d9ec23057df16f107";

// ============================================================================
// Fetch mock helpers
// ============================================================================

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

/** Minimal character JSON that satisfies parseCharacterFromJson */
const CHAR_JSON = {
  id: "0xcharid",
  character_address: "0xcharaddr",
  metadata: {
    name: "TestCharacter",
    description: "",
    url: "",
    assembly_id: "0x0",
  },
  tribe_id: 42,
  key: { item_id: "123", tenant: "tauceti" },
  owner_cap_id: "0xcap",
};

/** Build the deeply nested GraphQL response for getObjectAndCharacterOwner. */
function makeAssemblyResponse(options: {
  asMoveObject?: object | null;
  objectJson?: Record<string, unknown>;
  typeRepr?: string;
  withCharacter?: boolean;
  withEnergySource?: boolean;
  withDestinationGate?: boolean;
  dynamicFields?: object[];
}) {
  const {
    asMoveObject = null,
    objectJson = { id: "0xobj", type_id: "77917" },
    typeRepr = `${TEST_PKG}::storage_unit::StorageUnit`,
    withCharacter = false,
    withEnergySource = false,
    withDestinationGate = false,
    dynamicFields,
  } = options;

  if (asMoveObject === null) {
    return { data: { object: { asMoveObject: null } } };
  }

  const charPath = withCharacter
    ? {
        asAddress: {
          asObject: {
            asMoveObject: {
              owner: {
                address: {
                  objects: {
                    nodes: [
                      {
                        contents: {
                          authorizedObj: {
                            asAddress: {
                              asObject: {
                                asMoveObject: {
                                  contents: { json: CHAR_JSON },
                                },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      }
    : null;

  const energySource = withEnergySource
    ? {
        asAddress: {
          asObject: {
            asMoveObject: {
              contents: {
                json: { id: "0xenergy", type_id: "88092" },
              },
            },
          },
        },
      }
    : undefined;

  const destinationGate = withDestinationGate
    ? {
        asAddress: {
          asObject: {
            asMoveObject: {
              contents: {
                json: { id: "0xgate", type_id: "83907" },
              },
            },
          },
        },
      }
    : undefined;

  return {
    data: {
      object: {
        asMoveObject: {
          contents: {
            json: objectJson,
            type: { repr: typeRepr },
            bcs: "",
            extract: charPath,
            energySource,
            destinationGate,
          },
          ...(dynamicFields ? { dynamicFields: { nodes: dynamicFields } } : {}),
        },
      },
    },
  };
}

// ============================================================================
// executeGraphQLQuery
// ============================================================================

describe("executeGraphQLQuery", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubEnv("VITE_EVE_WORLD_PACKAGE_ID", TEST_PKG);
    fetchMock = mockFetch({ data: { object: null } });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("makes a POST request with correct Content-Type", async () => {
    await executeGraphQLQuery("{ __typename }", {});
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("encodes query and variables in the request body", async () => {
    const query = "query Test { __typename }";
    const variables = { address: "0x123" };
    await executeGraphQLQuery(query, variables);
    const [, init] = fetchMock.mock.calls[0]!;
    expect(JSON.parse(init.body)).toEqual({ query, variables });
  });

  it("resolves to the parsed JSON from a successful response", async () => {
    const payload = { data: { object: { address: "0xabc" } } };
    vi.stubGlobal("fetch", mockFetch(payload));
    const result = await executeGraphQLQuery("{ object }", {});
    expect(result).toEqual(payload);
  });

  it("throws an error for a 500 HTTP response", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 500));
    await expect(executeGraphQLQuery("{ object }", {})).rejects.toThrow(
      "HTTP error! status: 500",
    );
  });

  it("calls getSuiGraphqlEndpoint() to determine the URL", async () => {
    await executeGraphQLQuery("{ __typename }", {});
    const [url] = fetchMock.mock.calls[0]!;
    // Default endpoint is testnet
    expect(url).toContain("testnet.sui.io");
  });
});

// ============================================================================
// getObjectWithJson
// ============================================================================

describe("getObjectWithJson", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("passes GET_OBJECT_WITH_JSON query and address variable to fetch", async () => {
    const fetchMock = mockFetch({ data: {} });
    vi.stubGlobal("fetch", fetchMock);

    await getObjectWithJson("0xabc");

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.query).toBe(GET_OBJECT_WITH_JSON);
    expect(body.variables).toEqual({ address: "0xabc" });
  });
});

// ============================================================================
// getObjectWithDynamicFields
// ============================================================================

describe("getObjectWithDynamicFields", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("passes GET_OBJECT_WITH_DYNAMIC_FIELDS query and objectId variable to fetch", async () => {
    const fetchMock = mockFetch({ data: {} });
    vi.stubGlobal("fetch", fetchMock);

    await getObjectWithDynamicFields("0xdef");

    const [, init] = fetchMock.mock.calls[0]!;
    const body = JSON.parse(init.body);
    expect(body.query).toBe(GET_OBJECT_WITH_DYNAMIC_FIELDS);
    expect(body.variables).toEqual({ objectId: "0xdef" });
  });
});

// ============================================================================
// getAssemblyWithOwner
// ============================================================================

describe("getAssemblyWithOwner", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_EVE_WORLD_PACKAGE_ID", TEST_PKG);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns all null fields when fetch throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network failure")),
    );

    const result = await getAssemblyWithOwner("0xassembly");
    expect(result).toEqual({
      moveObject: null,
      assemblyOwner: null,
      energySource: null,
      destinationGate: null,
    });
  });

  it("returns all null fields when asMoveObject is null", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(makeAssemblyResponse({ asMoveObject: null })),
    );

    const result = await getAssemblyWithOwner("0xassembly");
    expect(result).toEqual({
      moveObject: null,
      assemblyOwner: null,
      energySource: null,
      destinationGate: null,
    });
  });

  it("returns moveObject but null owner fields when character path is missing", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        makeAssemblyResponse({
          asMoveObject: {},
          withCharacter: false,
          withEnergySource: true,
        }),
      ),
    );

    const result = await getAssemblyWithOwner("0xassembly");
    expect(result.moveObject).not.toBeNull();
    expect(result.assemblyOwner).toBeNull();
    expect(result.energySource).toBeNull();
    expect(result.destinationGate).toBeNull();
  });

  it("populates all fields for a full valid response", async () => {
    const dynField = {
      name: { json: "inventory_key", type: { repr: "0x::String" } },
      contents: { json: { key: "inv", value: {} }, type: { layout: "" } },
    };

    vi.stubGlobal(
      "fetch",
      mockFetch(
        makeAssemblyResponse({
          asMoveObject: {},
          withCharacter: true,
          withEnergySource: true,
          withDestinationGate: true,
          dynamicFields: [dynField],
        }),
      ),
    );

    const result = await getAssemblyWithOwner("0xassembly");

    expect(result.moveObject).not.toBeNull();
    expect(result.assemblyOwner).not.toBeNull();
    expect(result.assemblyOwner?.name).toBe("TestCharacter");
    expect(result.energySource).not.toBeNull();
    expect(result.destinationGate).not.toBeNull();
    expect(result.moveObject?.dynamicFields?.nodes).toHaveLength(1);
  });

  it("returns energySource: null (no throw) for a network node without parent energy source", async () => {
    vi.stubGlobal(
      "fetch",
      mockFetch(
        makeAssemblyResponse({
          asMoveObject: {},
          objectJson: { id: "0xnode", type_id: "88092" },
          typeRepr: `${TEST_PKG}::network_node::NetworkNode`,
          withCharacter: true,
          withEnergySource: false,
        }),
      ),
    );

    const result = await getAssemblyWithOwner("0xassembly");
    expect(result.energySource).toBeNull();
    expect(result.assemblyOwner).not.toBeNull();
    expect(result.moveObject?.contents.type?.repr).toBe(
      `${TEST_PKG}::network_node::NetworkNode`,
    );
  });
});
