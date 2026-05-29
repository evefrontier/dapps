import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES, ERRORS, parseErrorFromMessage } from "../errors";

// ============================================================================
// ERRORS object — named aliases are same reference as numeric entries
// ============================================================================

describe("ERRORS named aliases", () => {
  it.each([
    [
      "UNKNOWN_ERROR",
      {
        code: 1001,
        name: "Unknown Error",
        message: "An unknown error occurred.",
      },
    ],
    [
      "CONTRACT_CALL",
      {
        code: 2001,
        name: "Contract Call Error",
        message: "Error calling the smart contract.",
      },
    ],
    [
      "ABI_FUNCTION_NOT_FOUND",
      {
        code: 2004,
        name: "ABI Function Not Found Error",
        message: "Function not found in ABI",
      },
    ],
    [
      "FORWARDER_NOT_FOUND",
      {
        code: 2005,
        name: "ERC2771 Forwarder contract Not Found Error",
        message: "ERC2771 forwarder contract could not be found",
      },
    ],
    [
      "CALLFROM_NOT_FOUND",
      {
        code: 2006,
        name: "callFrom Function Not Found Error",
        message: "callFrom Function not found in ABI",
      },
    ],
    [
      "INSUFFICIENT_EVE",
      {
        code: 3002,
        name: "Insufficient Eve",
        message: "Insufficient EVE.",
      },
    ],
    [
      "LENS_UNAVAILABLE",
      {
        code: 5001,
        name: "Lens Unavailable",
        message: "There are no lenses available here",
      },
    ],
  ])("%s exposes the expected public error", (alias, expected) => {
    expect(ERRORS[alias]).toMatchObject(expected);
  });
});

// ============================================================================
// ERROR_MESSAGES — only numeric keys, no string aliases
// ============================================================================

describe("ERROR_MESSAGES", () => {
  it("contains the expected public message map by numeric code", () => {
    expect(ERROR_MESSAGES).toEqual({
      1001: "An unknown error occurred.",
      1002: "",
      1003: "",
      2001: "Error calling the smart contract.",
      2002: "",
      2003: "World resource not found.",
      2004: "Function not found in ABI",
      2005: "ERC2771 forwarder contract could not be found",
      2006: "callFrom Function not found in ABI",
      2007: "Size of bytes does not match expected size.",
      2008: "Function simulation reverted",
      3001: "Insufficient funds for GAS.",
      3002: "Insufficient EVE.",
      3003: "User rejected the transaction.",
      3004: "",
      4001: "",
      4002: "",
      4003: "Please check the chain your wallet is connected to.",
      5001: "There are no lenses available here",
    });
  });

  it("does not expose named aliases as message keys", () => {
    expect(Object.keys(ERROR_MESSAGES)).not.toEqual(
      expect.arrayContaining([
        "UNKNOWN_ERROR",
        "CONTRACT_CALL",
        "ABI_FUNCTION_NOT_FOUND",
        "FORWARDER_NOT_FOUND",
        "CALLFROM_NOT_FOUND",
        "INSUFFICIENT_EVE",
        "LENS_UNAVAILABLE",
      ]),
    );
  });
});

// ============================================================================
// parseErrorFromMessage — one case per code / pattern
// ============================================================================

describe("parseErrorFromMessage", () => {
  // 1001 - Unknown Error
  it("matches 'unknown error' → code 1001", () => {
    expect(parseErrorFromMessage("unknown error occurred")).toMatchObject({
      code: 1001,
    });
  });

  // 1002 - Network Error
  it("matches 'network error' → code 1002", () => {
    expect(parseErrorFromMessage("network error")).toMatchObject({
      code: 1002,
    });
  });

  it("matches 'connection failed' → code 1002", () => {
    expect(parseErrorFromMessage("connection failed")).toMatchObject({
      code: 1002,
    });
  });

  it("matches 'failed to fetch' → code 1002", () => {
    expect(parseErrorFromMessage("failed to fetch")).toMatchObject({
      code: 1002,
    });
  });

  it("case-insensitive: 'Network Error' → code 1002", () => {
    expect(parseErrorFromMessage("Network Error")).toMatchObject({
      code: 1002,
    });
  });

  it("case-insensitive: 'NETWORK ERROR' → code 1002", () => {
    expect(parseErrorFromMessage("NETWORK ERROR")).toMatchObject({
      code: 1002,
    });
  });

  // 1003 - Invalid Input Error
  it("matches 'invalid input' → code 1003", () => {
    expect(parseErrorFromMessage("invalid input provided")).toMatchObject({
      code: 1003,
    });
  });

  it("matches 'bad request' → code 1003", () => {
    expect(parseErrorFromMessage("bad request")).toMatchObject({ code: 1003 });
  });

  it("matches 'malformed' → code 1003", () => {
    expect(parseErrorFromMessage("malformed data")).toMatchObject({
      code: 1003,
    });
  });

  // 2001 - Contract Call Error
  it("matches 'contract call error' → code 2001", () => {
    expect(parseErrorFromMessage("contract call error")).toMatchObject({
      code: 2001,
    });
  });

  it("matches 'execution reverted' → code 2001", () => {
    expect(parseErrorFromMessage("execution reverted")).toMatchObject({
      code: 2001,
    });
  });

  it("matches 'out of gas' → code 2001", () => {
    expect(parseErrorFromMessage("out of gas")).toMatchObject({ code: 2001 });
  });

  // 2002 - Contract Deployment Error
  it("matches 'contract deployment error' → code 2002", () => {
    expect(parseErrorFromMessage("contract deployment error")).toMatchObject({
      code: 2002,
    });
  });

  it("matches 'contract creation failed' → code 2002", () => {
    expect(parseErrorFromMessage("contract creation failed")).toMatchObject({
      code: 2002,
    });
  });

  // 2003 - World Resource Not Found
  it("matches 'Error: World_ResourceNotFound' → code 2003", () => {
    expect(
      parseErrorFromMessage("Error: World_ResourceNotFound"),
    ).toMatchObject({ code: 2003 });
  });

  // 2004 - ABI Function Not Found
  it("matches 'AbiErrorSignatureNotFoundError' → code 2004", () => {
    expect(
      parseErrorFromMessage("AbiErrorSignatureNotFoundError"),
    ).toMatchObject({ code: 2004 });
  });

  // 2005 - Forwarder Not Found
  it("matches 'Forwarder contract' → code 2005", () => {
    expect(parseErrorFromMessage("Forwarder contract not found")).toMatchObject(
      { code: 2005 },
    );
  });

  // 2006 - callFrom Not Found
  it("matches 'callFrom Function' → code 2006", () => {
    expect(
      parseErrorFromMessage("callFrom Function not available"),
    ).toMatchObject({ code: 2006 });
  });

  // 2007 - ABI Encoding Bytes Size Mismatch
  it("matches 'does not match expected size' → code 2007", () => {
    expect(
      parseErrorFromMessage("bytes does not match expected size"),
    ).toMatchObject({ code: 2007 });
  });

  // 2008 - Contract Revert Error
  it("matches 'contract revert' → code 2008", () => {
    expect(parseErrorFromMessage("contract revert")).toMatchObject({
      code: 2008,
    });
  });

  it("matches 'reverted' → code 2008", () => {
    expect(parseErrorFromMessage("reverted")).toMatchObject({ code: 2008 });
  });

  // 3001 - Insufficient Gas
  it("matches 'insufficient gas' → code 3001", () => {
    expect(parseErrorFromMessage("insufficient gas")).toMatchObject({
      code: 3001,
    });
  });

  it("matches 'not enough gas' → code 3001", () => {
    expect(parseErrorFromMessage("not enough gas")).toMatchObject({
      code: 3001,
    });
  });

  it("matches 'balance too low' → code 3001", () => {
    expect(parseErrorFromMessage("balance too low")).toMatchObject({
      code: 3001,
    });
  });

  // 3002 - Insufficient EVE
  it("matches 'insufficient EVE' → code 3002", () => {
    expect(parseErrorFromMessage("insufficient EVE")).toMatchObject({
      code: 3002,
    });
  });

  it("matches 'not enough EVE' → code 3002", () => {
    expect(parseErrorFromMessage("not enough EVE")).toMatchObject({
      code: 3002,
    });
  });

  // 3003 - User Denied Transaction
  it("matches 'User denied transaction signature.' → code 3003", () => {
    expect(
      parseErrorFromMessage("User denied transaction signature."),
    ).toMatchObject({ code: 3003 });
  });

  it("matches 'transaction rejected' → code 3003", () => {
    expect(parseErrorFromMessage("transaction rejected")).toMatchObject({
      code: 3003,
    });
  });

  it("matches 'User rejected the request' → code 3003", () => {
    expect(parseErrorFromMessage("User rejected the request")).toMatchObject({
      code: 3003,
    });
  });

  // 3004 - Transaction Timeout
  it("matches 'transaction timeout' → code 3004", () => {
    expect(parseErrorFromMessage("transaction timeout")).toMatchObject({
      code: 3004,
    });
  });

  it("matches 'timeout exceeded' → code 3004", () => {
    expect(parseErrorFromMessage("timeout exceeded")).toMatchObject({
      code: 3004,
    });
  });

  // 4001 - Unauthorized Access
  it("matches 'unauthorized access' → code 4001", () => {
    expect(parseErrorFromMessage("unauthorized access")).toMatchObject({
      code: 4001,
    });
  });

  it("matches 'permission denied' → code 4001", () => {
    expect(parseErrorFromMessage("permission denied")).toMatchObject({
      code: 4001,
    });
  });

  // 4002 - User Not Logged In
  it("matches 'user not logged in' → code 4002", () => {
    expect(parseErrorFromMessage("user not logged in")).toMatchObject({
      code: 4002,
    });
  });

  it("matches 'authentication required' → code 4002", () => {
    expect(parseErrorFromMessage("authentication required")).toMatchObject({
      code: 4002,
    });
  });

  // 4003 - Chain Mismatch
  it("matches 'does not match the target chain' → code 4003", () => {
    expect(
      parseErrorFromMessage("chain does not match the target chain"),
    ).toMatchObject({ code: 4003 });
  });

  // 5001 - Lens Unavailable
  it("matches 'no lens' → code 5001", () => {
    expect(parseErrorFromMessage("no lens available")).toMatchObject({
      code: 5001,
    });
  });

  // Fallback
  it("returns code 1001 for an unrecognized error message", () => {
    expect(
      parseErrorFromMessage("some completely random xyz message"),
    ).toMatchObject({ code: 1001, name: "Unknown Error" });
  });
});
