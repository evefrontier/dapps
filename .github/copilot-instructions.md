# Code Review Guide for EVE Frontier Dapps

This guide provides instructions for agents reviewing code changes in this TypeScript/React monorepo. Focus on architectural patterns, component design, Sui SDK usage, and testing rather than linting issues (which are handled by ESLint and Prettier).

## Table of Contents

- [Repository Overview](#repository-overview)
- [Architecture Patterns](#architecture-patterns)
- [Sui SDK Usage](#sui-sdk-usage)
- [GraphQL Patterns](#graphql-patterns)
- [Constants and Configuration](#constants-and-configuration)
- [Error Handling](#error-handling)
- [Testing Requirements](#testing-requirements)
- [Common Issues to Flag](#common-issues-to-flag)
- [What NOT to Review](#what-not-to-review)

## Repository Overview

This monorepo contains TypeScript/React frontend applications for EVE Frontier that interact with the Sui blockchain.

### Package Structure

```
packages/
├── apps/                    # Deployable applications
│   └── assembly/            # Smart Assembly dApp (@eveworld/assembly)
└── libs/                    # Shared libraries
    ├── dapp-kit/            # Core SDK (@evefrontier/dapp-kit)
    └── ui-components/       # Shared UI components (@eveworld/ui-components)
```

### Key Packages

| Package | Description | Main Exports |
|---------|-------------|--------------|
| `@evefrontier/dapp-kit` | Core React hooks, providers, GraphQL client, and utilities | `EveFrontierProvider`, `useSmartObject`, `useConnection` |
| `@eveworld/ui-components` | Reusable EVE-styled React components | `EveButton`, `EveLayout`, `Header` |
| `@eveworld/assembly` | Smart Assembly management dApp | Application entry point |

### dapp-kit Internal Structure

```
packages/libs/dapp-kit/
├── config/           # Network configuration
├── graphql/          # GraphQL client, queries, and types
│   ├── client.ts     # Query execution functions
│   ├── queries.ts    # GraphQL query strings
│   └── types.ts      # Response type definitions
├── hooks/            # React hooks (useConnection, useSmartObject, etc.)
├── providers/        # React context providers
│   ├── EveFrontierProvider.tsx  # Main wrapper provider
│   ├── SmartObjectProvider.tsx  # Smart object data context
│   ├── VaultProvider.tsx       # Wallet configuration
│   └── NotificationProvider.tsx # User notifications
├── types/            # TypeScript type definitions
└── utils/            # Utility functions and constants
    ├── constants.ts  # Package IDs, endpoints, type IDs
    ├── mapping.ts    # Object ID derivation, status parsing
    ├── errors.ts     # Error types and parsing
    └── transforms.ts # Data transformation utilities
```

**Review Checklist:**

- [ ] Are new utilities placed in the appropriate `utils/` file?
- [ ] Are new types exported from `types/index.ts`?
- [ ] Are React hooks in `hooks/` and providers in `providers/`?
- [ ] Is the main export updated in `index.ts` when adding new public APIs?

## Architecture Patterns

### Provider Hierarchy

The `EveFrontierProvider` wraps the application with necessary context providers in a specific order:

```tsx
<QueryClientProvider>        {/* React Query for async state */}
  <DAppKitProvider>        {/* Sui blockchain client */}
      <VaultProvider>        {/* EVE wallet configuration */}
        <SmartObjectProvider> {/* Smart object data via GraphQL */}
          <NotificationProvider> {/* User notifications */}
            {children}
          </NotificationProvider>
        </SmartObjectProvider>
      </VaultProvider>
  </DAppKitProvider>
</QueryClientProvider>
```

**Review Checklist:**

- [ ] Are providers used at the correct level in the hierarchy?
- [ ] Are context hooks only called within their provider scope?
- [ ] Is state lifted to the appropriate provider level?

### Hook Patterns

Custom hooks follow consistent patterns:

```tsx
// Good - hook uses context and returns typed data
export const useSmartObject = () => {
  const context = useContext(SmartObjectContext);
  if (!context) {
    throw new Error("useSmartObject must be used within SmartObjectProvider");
  }
  return context;
};
```

**Review Checklist:**

- [ ] Do hooks validate they are within the correct provider?
- [ ] Are hook return types properly typed?
- [ ] Do hooks follow the `use` naming convention?

## Sui SDK Usage

### Subpath Imports (Critical)

The `@mysten/sui` package uses subpath exports. Always import from specific subpaths:

```tsx
// Good - specific subpath imports
import { bcs } from "@mysten/sui/bcs";
import { deriveObjectID } from "@mysten/sui/utils";
import { getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";

// Bad - main entry point doesn't export these
import { bcs, deriveObjectID } from "@mysten/sui";  // Won't work!
```

### BCS Serialization

Use BCS for serializing data for derived object calculations:

```tsx
import { bcs } from "@mysten/sui/bcs";

// Define struct matching Move struct
const TenantItemIdBcs = bcs.struct("TenantItemId", {
  item_id: bcs.u64(),
  tenant: bcs.string(),
});

// Serialize for key derivation
const key = TenantItemIdBcs.serialize({
  item_id: itemId,
  tenant: tenant,
}).toBytes();
```

### Derived Object IDs

Use `deriveObjectID` with registry lookups for deterministic object ID derivation:

```tsx
import { deriveObjectID } from "@mysten/sui/utils";

const objectId = deriveObjectID(
  registryAddress,                    // Parent object ID
  `${PACKAGE_ID}::module::StructType`, // Full type path
  serializedKey                       // BCS serialized key bytes
);
```

**Review Checklist:**

- [ ] Are `@mysten/sui` imports using subpaths (`/bcs`, `/utils`, `/client`)?
- [ ] Do BCS struct definitions match their Move counterparts?
- [ ] Are type paths fully qualified with package ID?

## GraphQL Patterns

### Query Organization

GraphQL queries are organized in `graphql/`:

- `queries.ts` - Query strings as template literals
- `client.ts` - Typed query execution functions
- `types.ts` - Response type definitions

```tsx
// queries.ts - Define query string
export const GET_OBJECT_BY_ADDRESS = `
  query GetObjectByAddress($address: SuiAddress!) {
    object(address: $address) {
      address
      asMoveObject { contents { json } }
    }
  }
`;

// client.ts - Typed execution function
export async function getObjectByAddress(address: string) {
  return executeGraphQLQuery<GetObjectByAddressResponse>(
    GET_OBJECT_BY_ADDRESS,
    { address }
  );
}
```

**Review Checklist:**

- [ ] Are new queries added to `queries.ts`?
- [ ] Do execution functions have proper TypeScript types?
- [ ] Are response types defined in `types.ts`?

## Constants and Configuration

### Environment Variables

Use Vite's `import.meta.env` for environment-specific configuration:

```tsx
// Access environment variables
const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT;

// Type definitions in vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_GRAPHQL_ENDPOINT: string;
}
```

### Constants Organization

Configuration values are accessed via getter functions in `utils/constants.ts` that read from environment variables:

```tsx
// Environment-based configuration (requires VITE_* env vars)
import { 
  getSuiGraphqlEndpoint,    // reads VITE_SUI_GRAPHQL_ENDPOINT
  getEveWorldPackageId,     // reads VITE_EVE_WORLD_PACKAGE_ID
  getCharacterOwnerCapType, // derived from package ID
  getObjectRegistryType,    // derived from package ID
} from "@evefrontier/dapp-kit";

// Usage
const endpoint = getSuiGraphqlEndpoint();
const packageId = getEveWorldPackageId();

// In-game item type IDs (static constants)
export enum TYPEIDS {
  SMART_STORAGE_UNIT = 77917,
  NETWORK_NODE = 88092,
  // ...
}
```

**Required Environment Variables:**

```bash
# .env
VITE_SUI_GRAPHQL_ENDPOINT=https://graphql.testnet.sui.io/graphql
VITE_EVE_WORLD_PACKAGE_ID=0x...
VITE_OBJECT_ID=                      # Optional: override assembly Sui object ID from env
```

**Tenant (query param):** The runtime resolves tenant from the URL query param `?tenant=` with a fallback (e.g. `"testevenet"`). Document and code should assume tenant comes from the URL (or explicit caller-provided value), not from env.

**Review Checklist:**

- [ ] Are magic strings/numbers extracted to constants?
- [ ] Are environment variables prefixed with `VITE_`?
- [ ] Are required env vars documented in `.envsample`?
- [ ] Are getter functions used instead of hardcoded values for configuration?
- [ ] Is tenant sourced from URL query param (or caller)?

## Error Handling

### Error Types

Errors are categorized with codes in `utils/errors.ts`:

```tsx
export const ERRORS: Record<number | string, ErrorType> = {
  1001: { code: 1001, name: "Unknown Error", patterns: [...], message: "..." },
  2001: { code: 2001, name: "Contract Call Error", patterns: [...], message: "..." },
  3001: { code: 3001, name: "Insufficient Gas", patterns: [...], message: "..." },
  // ...
};
```

### Error Parsing

Use pattern matching to identify error types:

```tsx
import { parseErrorFromMessage } from "@evefrontier/dapp-kit";

const { code, name } = parseErrorFromMessage(error.message);
```

### User Notifications

Use the `NotificationProvider` for user-facing errors:

```tsx
const { notify } = useNotification();

notify({
  type: Severity.Error,
  message: "Transaction failed",
  name: "Contract Error",
});
```

**Review Checklist:**

- [ ] Are errors categorized appropriately?
- [ ] Are user-facing errors shown via notifications?
- [ ] Are technical errors logged to console?

## Testing Requirements

### Test Organization

Tests are placed in `__tests__/` directories alongside source files:

```
utils/
├── mapping.ts
├── __tests__/
│   └── mapping.test.ts
```

### Vitest Patterns

Use Vitest for testing with these patterns:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock modules
vi.mock("../../graphql/client", () => ({
  getSingletonObjectByType: vi.fn(),
}));

describe("getObjectId", () => {
  beforeEach(() => {
    vi.resetModules();  // Reset module cache for fresh imports
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("derives object ID correctly", async () => {
    vi.mocked(getSingletonObjectByType).mockResolvedValueOnce({
      data: { objects: { nodes: [{ address: "0x123" }] } },
    });

    const { getObjectId } = await import("../mapping");
    const result = await getObjectId("12345", "testevenet");

    expect(result).toBe("0x...");
  });
});
```

### Testing Cached State

Use `vi.resetModules()` when testing code with module-level caching:

```tsx
beforeEach(() => {
  vi.resetModules();  // Clears cached registry addresses, etc.
});

it("caches registry address", async () => {
  const { getRegistryAddress } = await import("../mapping");
  
  await getRegistryAddress(REGISTRY_TYPES.ASSEMBLY);
  await getRegistryAddress(REGISTRY_TYPES.ASSEMBLY);

  expect(getSingletonObjectByType).toHaveBeenCalledTimes(1);  // Cached!
});
```

### Test Vectors

For derivation functions, use known test vectors to verify correctness:

```tsx
it("works with TenantItemId struct", () => {
  const key = TenantItemIdBcs.serialize({
    item_id: 691735,
    tenant: "test",
  }).toBytes();

  const result = deriveObjectID(
    "0x70c704eb8ee89c910a31ecf550a85514d5a4d3d2742cc2fbd5b2131c3513b79c",
    "0x8941524ae368d91a7f9ee95466d3e60b75ddc16de3c3b9233dc11f85ce86c258::game_id::TenantItemId",
    key
  );

  expect(result).toBe(
    "0xccee853995609e171763798b6faaf635793a9a88d79211d6486bfdd268d3fd73"
  );
});
```

**Review Checklist:**

- [ ] Are tests present for new functionality?
- [ ] Do tests cover success and error paths?
- [ ] Are mocks properly set up and cleared?
- [ ] Do derivation tests use verified test vectors?

## Common Issues to Flag

### Import Issues

- Using `@mysten/sui` instead of subpaths (`@mysten/sui/bcs`, etc.)
- Missing exports in `index.ts` for public APIs
- Circular dependencies between modules

### Type Safety Issues

- Using `any` type without justification
- Missing return types on exported functions
- Untyped GraphQL responses

### Architecture Issues

- Business logic in components (should be in hooks/utils)
- Direct API calls in components (use providers/hooks)
- Not using the established provider hierarchy

### Testing Issues

- Missing `vi.resetModules()` when testing cached state
- Not mocking GraphQL calls
- Hardcoded values that should use constants

### Configuration Issues

- Hardcoded package IDs or endpoints
- Missing environment variable definitions
- Not using `VITE_` prefix for client-side env vars

## What NOT to Review

Do not flag issues handled by automated tools:

- **Code formatting** - Handled by Prettier
- **Unused imports** - Handled by ESLint
- **TypeScript strict checks** - Handled by `tsc`
- **Naming conventions** - Handled by ESLint rules

Focus on logic, architecture, Sui SDK usage, testing, and type safety rather than style issues.

## Review Process

1. **Understand the Change**: Read the PR description and understand the goal
2. **Check Imports**: Verify Sui SDK uses correct subpath imports
3. **Review Architecture**: Ensure code follows established patterns
4. **Check Types**: Verify proper TypeScript typing
5. **Verify Tests**: Check test coverage and patterns
6. **Check Constants**: Ensure no hardcoded values that should be constants

## Example Review Comments

**Good Review Comment:**
> "This should import from `@mysten/sui/transactions` instead of `@mysten/sui`. The SDK uses subpath exports."

**Bad Review Comment:**
> "You should add a semicolon here." (Handled by Prettier)

**Good Review Comment:**
> "Consider adding this query to `queries.ts` and creating a typed helper in `client.ts` to match the established pattern."

**Bad Review Comment:**
> "This import is unused." (Handled by ESLint)

