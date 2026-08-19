# MVR world-type resolution

This directory resolves EVE World Move types (referenced by human-readable MVR
names like `@evefrontier/world-test`) to the concrete, on-chain-correct
addresses the dapp interpolates into GraphQL/gRPC `type:` filters and event
subscriptions.

Resolution is **pre-computed at build time** into a committed snapshot, so the
running app performs only in-memory lookups — it never calls the MVR API.

## Files

| File | Role |
| --- | --- |
| `worldTypeKeys.ts` | **Seed / source of truth.** `WORLD_TYPE_KEYS` lists the `module::Type` keys the app resolves; `MVR_SCAN_SEED` lists the same types as fully-qualified MVR literals across every tier (`world`, `world-dev`, `world-test`, `world-uat`). The literals exist only so the generator can discover what to resolve. |
| `mvrCache.generated.ts` | **Generated, committed snapshot.** Exposes `getMvrCache('mainnet' \| 'testnet') → { packages, types }`. `types` maps each MVR type name to its **type-origin** tag (for `type:` filters); `packages` maps each MVR name to its **latest** package id (for `moveCall` targets). Do not hand-edit. |
| `worldTypes.ts` | **Runtime consumer.** `getWorldType(key)` / `getEveWorldPackageId()` read the snapshot and return the resolved value. |

The generated file **must be committed** — the package will not build without it,
and the whole point of the static approach is that the resolved addresses ship
with the build.

## When to regenerate

Regenerate `mvrCache.generated.ts` whenever:

- a world contract is **upgraded** (the `packages` latest-id map drifts), or
- you **add a type or tier** — first add it to *both* `WORLD_TYPE_KEYS` and
  `MVR_SCAN_SEED` in `worldTypeKeys.ts`, keeping the two in sync.

A missing snapshot entry throws at runtime (fail-loud) rather than silently
building a filter that matches nothing — that error means the snapshot is stale.

## How to regenerate

```bash
# from packages/libs/dapp-kit
bun run gen:mvr
```

This runs the official `@mysten/mvr-static` CLI, which scans `worldTypeKeys.ts`
for the `MVR_SCAN_SEED` literals, resolves them against the MVR API for both
mainnet and testnet, and rewrites `mvrCache.generated.ts` in place. Commit the
result.

The MVR API is only ever contacted here, at generation time — never in
production. This matches Mysten's guidance: it is fine to call the API to
generate a local cache included in the build, but the API surface is not a
stable public contract and must not be called at runtime.

### The `enquirer` patch

`@mysten/mvr-static@0.4.17` cannot be run as-shipped in this toolchain: its
`enquirer` dependency has no ESM `prompt` export, so its CLI throws
`Export named 'prompt' not found` under **both Node and Bun**. We fix that with a
one-line `bun patch` committed to the repo:

- `patches/@mysten%2Fmvr-static@0.4.17.patch` — rewrites the broken
  `import { prompt } from "enquirer"` to a default import.
- registered under `patchedDependencies` in the **root** `package.json`, so
  `bun install` applies it automatically for everyone. No per-person setup.

If Mysten fixes the top-level `enquirer` import upstream, bump the dependency and
drop the patch (delete the patch file and the `patchedDependencies` entry).
