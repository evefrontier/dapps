# @evefrontier/dapp-kit

## 0.2.0-alpha.1

### Minor Changes

- world-contracts dev-v1.1.16+ power grids: `parseEntity` reads the `bays` / `on_at_last_settled` layout into an `EntityPowerGrid` with `model: 'pools'` and `bays`, and generators gain `fuelType`, `impulseLimit` and `volatilityLimit`. dev-v1.1.11 grids read as before (`model` unset means `fuelFactor`); dev-v1.1.12 to v1.1.15 are not supported
- the fuel maths ports the v1.1.16+ `power_grid` projection: fuel pooled by type, each generator burning its pool at `usable_impulse` with output scaled by volatility, power in plain MW and fuel at 1e9 (kg), stepping through each run-out and Firm-load trip. `projectedFuel`, `fuelBurn`, `fuelBurnPerHour` and `msUntilEmpty` pick the maths by `model`
- add `projectGrid`, `burnBreakdown` (the burn per generator, fuel source and module), `normalizeMw`, `normalizeFuel`, `fuelUnit`, `powerScale`, `fuelScale`, `poolGeneratorBurn`, `generatorOutput`, `volatilityShare` and `POOLS_FUEL_SCALE`; `fromFixed` takes an optional scale; `GridSummary` values are at 10^4 for either model, with a new `fuelUnit` and `burnImpulse` (the usable impulse every burning generator shares, or null); `BurnBreakdown` gives each burning generator's usable impulse in `impulses`, and `sharedBurnImpulse` picks out the shared one
- `SmartObjectProvider` and `EveFrontierProvider` take `updateTransport`, `subscription` by default or `polling`. With `subscription`, the entity is refetched when the GraphQL subscription endpoint (`/graphql/subscriptions`, beside `/graphql`) delivers one of its inventory or power events, polling drops to a 60 s backstop, and a subscription that fails or is not served falls back to 15 s polling
- add `getSuiGraphqlSubscriptionEndpoint`, `GRAPHQL_SUBSCRIPTION_ENDPOINTS`, `backstopInterval`, `getSubscriptionBackstopInterval`, `UpdateTransport` and `SubscriptionStatus`, and bring back `getGraphqlSubscriptionAuthToken`. New env: `VITE_SUI_GRAPHQL_SUBSCRIPTION_URL` and `VITE_SUBSCRIPTION_POLLING_INTERVAL`; `VITE_GRAPHQL_SUBSCRIPTION_AUTH_TOKEN` is read again
- add the `graphql-sse` dependency

## 0.2.0-alpha.0

### Minor Changes

Breaking: dapp-kit now reads world-contracts entities and resolves world types per tier through `@evefrontier/wallet-core` 0.1.0.

- remove the API tied to the archived world package: `getAssemblyWithOwner`, `getObjectAndCharacterOwner`, `getWalletCharacters`, `getCharacterAndOwnedObjects`, `getSingletonConfigObjectByType`, `transformToAssembly`, `transformToCharacter`, `parseCharacterFromJson`, `getCharacterOwnedObjects`/`Json`, `getEnergyConfig`, `getEnergyUsageForType`, `getFuelEfficiencyConfig`, `getFuelEfficiencyForType`, `getAssemblyType`, `getEveWorldPackageId` and the `OwnerCap`/`PlayerProfile`/`EnergyConfig`/`FuelConfig` type-string getters; deprecate `getObjectOwnerAndOwnedObjectsByType`/`WithJson`
- `SmartObjectProvider` reads world entities: `useSmartObject()` exposes `entity` (parsed components, layout, power grid, inventories, actions) and `entityOwner` (AccessCap holder and Character); `assembly` and `assemblyOwner` are always `null`
- add `getEntity`, `getTableEntries`, `getObjectLatestVersion`, `getObjectOwner` and the `fetchEntity` / `parseEntity` / `fetchEntityOwner` utilities
- world types resolve through `@evefrontier/wallet-core` 0.1.0 per tier: `VITE_EVE_WORLD_TIER` (dev | test | uat | ptu | live) replaces `VITE_EVE_WORLD_PACKAGE_ID`, falling back to the tenant's `worldTier`; `getWorldType` takes package-qualified keys (`core::entity_key::EntityKey`) and an optional tenant; add `getWorldTier` and `getWorldPackageId`
- `getObjectId` derives ids from core `entity_key::EntityKey` under the tier's ObjectRegistry; `getRegistryAddress` takes an optional tenant
- remove the old-world event stream; polling, with a cheap version check per tick, is the only update source
- remove `getGraphqlSubscriptionEndpoint`, `getGraphqlSubscriptionAuthToken` and `getSuiGrpcBaseUrl`, which only served the event stream; `VITE_GRAPHQL_SUBSCRIPTION_AUTH_TOKEN` is no longer read

## 0.1.10

### Patch Changes

- regenerate mvr-cache

## 0.1.10

### Patch Changes

- use wallet-core for types, defs

## 0.1.9

### Patch Changes

- fix logger

## 0.1.8

### Patch Changes

- update test server configs

## 0.1.7

### Patch Changes

- add eve pkg ids

## 0.1.6

### Patch Changes

- add datahub tenant switching

## 0.1.5

### Patch Changes

- readme

## 0.1.4

### Patch Changes

- implement updates to update-metadata sponsored tx

## 0.1.3

### Patch Changes

- add helper for fuel efficiency calc

## 0.1.2

### Patch Changes

- add .env sui object override to smart obj context

## 0.1.1

### Patch Changes

- update supported wallets
