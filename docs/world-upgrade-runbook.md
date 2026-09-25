# World upgrade runbook

Rolling a new world or currency (EVE) package through `wallet-core` and `dapps`.

Run this when a world/currency contract is upgraded, a tenant or tier is added,
or an `@evefrontier/world*` / `@evefrontier/currency*` MVR name is re-pointed.

## Key facts

- `wallet-core` owns the MVR cache. `TENANT_CONFIG` package ids are derived from
  it via each tenant's `mvrName` / `currencyMvrName` in `src/tenant/tenants.ts`.
- `gen:mvr` returns whatever the MVR registry currently resolves. Update the
  registration first, or regeneration is a no-op.
- Type tags (`type:` filters, `deriveObjectID` keys) use the type-origin package:
  `getTenantWorldType(tenant, key)`. `moveCall` targets use the latest package.
- dapp-kit resolves by tenant (`utils/mapping.ts`) and by the
  `VITE_EVE_WORLD_PACKAGE_ID` env value (`utils/mvr/worldTypes.ts`). Both read
  wallet-core's cache.
- All tiers resolve on Sui testnet.

## Steps

**1. Re-point the MVR name** to the new package on the MVR registry.

**2. Regenerate the cache in `wallet-core`**

```bash
bun run gen:mvr
```

New type → add it to `WORLD_TYPE_KEYS` and the scan seeds in
`src/tenant/mvr/worldTypeKeys.ts`. New tenant → add it to `TENANT_SOURCE`.

Check that addresses changed, not only key order (no output means nothing
changed):

```bash
f=src/tenant/mvr/mvrCache.generated.ts
diff <(git show HEAD:./$f | grep -oE '0x[0-9a-f]{64}[^"]*' | sort -u) \
     <(grep -oE '0x[0-9a-f]{64}[^"]*' $f | sort -u)
```

**3. Verify and bump wallet-core**

Update expected ids in `tests/tenant/index.unit.test.ts`, then bump `version` in
`package.json`.

**4. Publish wallet-core** to GitHub Packages.

**5. Pin it in dapps**

```jsonc
// packages/libs/dapp-kit/package.json
"@evefrontier/wallet-core": "<new-version>"
```

In `dapps`:
```bash
bun install
```

**6. Verify dapp-kit**

```bash
cd packages/libs/dapp-kit
npx tsc --noEmit && npx vitest run && npm run build
```

Update expected ids in `utils/__tests__/mapping.test.ts` and
`utils/__tests__/constants.test.ts`.

**7. Check the app** — `bun run dev` in `packages/apps/assembly`, load the
affected tenant (`?tenant=<id>`), and confirm `.env`'s
`VITE_EVE_WORLD_PACKAGE_ID` names the intended tier.

**8. Commit** the regenerated cache and version bumps in both repos.

## Testing before publish

Pack wallet-core and point dapp-kit at the tarball:

```bash
cd sui/wallet-core && bun run pack
```

```jsonc
"@evefrontier/wallet-core": "/abs/path/to/wallet-core/evefrontier-wallet-core-<version>.tgz"
```

bun caches a re-packed tgz of the same version. To force a fresh copy:

```bash
rm -rf node_modules/@evefrontier/wallet-core node_modules/.bun/@evefrontier+wallet-core@*
bun install --force
```

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| Regen only reorders keys | MVR registration not updated |
| App shows the old package | Cached same-version tgz; force reinstall |
| Tenant and env paths disagree | Tenant's tier ≠ `VITE_EVE_WORLD_PACKAGE_ID` |
| "no type-origin entry for …" | Type/tier missing from the scan seeds |
| Derived id ≠ on-chain object | Mismatched `tenant` string, type-origin package, registry parent, or network |
