# EVE Frontier Decentralized Applications 🚀

This is the monorepo for the decentralized applications of EVE Frontier on Sui and support libraries.

## Table of Contents

1. [Project Overview](#project-overview) 🌟
2. [Prerequisites](#prerequisites) 🔗
3. [Getting Started](#getting-started) 🚀
4. [Building Packages](#building-packages) 🛠️
5. [Other Useful Commands](#other-useful-commands) 🔧
6. [Creating an EVE Frontier Dapp](#creating-an-eve-frontier-dapp) 🏗️
7. [Contributing](#contributing) 🤝
8. [Releasing](#releasing) 🚢
9. [License](#license) 📜

## Project Overview

This monorepo contains the decentralized applications (dApps) of EVE Frontier, along with their support libraries.

| Package | Path | Description |
| --- | --- | --- |
| [`@evefrontier/dapp-kit`](./packages/libs/dapp-kit/README.md) | `packages/libs/dapp-kit` | React SDK for building EVE Frontier dApps on Sui. Published to GitHub Packages. |
| [`@eveworld/ui-components`](./packages/libs/ui-components/README.md) | `packages/libs/ui-components` | The grid console's UI kit: views and stylesheet, no chain code. |
| [`@eveworld/assembly`](./packages/apps/assembly/README.md) | `packages/apps/assembly` | The Smart Assembly dApp. |

Further reading:

- [World upgrade runbook](./docs/world-upgrade-runbook.md): what to do when the EVE Frontier world contracts are upgraded.
- [dapp-kit API documentation](https://sui-docs.evefrontier.com/) (TypeDoc).

## Prerequisites

- Node.js 26.13.1 (see [`.nvmrc`](./.nvmrc))
- Bun 1.4.4 (see `packageManager` in [`package.json`](./package.json))
- A GitHub token with the `read:packages` scope, exported as `GITHUB_TOKEN`. `@evefrontier/*` packages are installed from GitHub Packages (see [`bunfig.toml`](./bunfig.toml)).

This monorepo is an Nx-configured Bun workspace. Running `bun install` from the root installs dependencies for every package.

## Getting Started

To install all dependencies, run:

```bash
export GITHUB_TOKEN=<token with read:packages>
bun install
```

Bun only installs package versions that were published at least 24 hours ago (`minimumReleaseAge` in `bunfig.toml`).

To run the assembly dApp locally, follow the steps in its [README](./packages/apps/assembly/README.md#getting-started).

## Building Packages

Nx can be used to invoke build commands for each package directly from the project root.

To build all packages, run:

```bash
bun run build
```

To build a specific package, use the target script flag:

```bash
bunx nx run @eveworld/assembly:build
```

## Other Useful Commands

Run these from the repository root:

```bash
bun run typecheck                            # Typecheck every package
bun run lint                                 # Check formatting and lint rules (Biome)
bun run lint:fix                             # Apply Biome fixes
bun --filter @evefrontier/dapp-kit test:run  # Run the dapp-kit tests once
bun --filter @evefrontier/dapp-kit docs      # Generate the dapp-kit TypeDoc site
bun audit                                    # Check dependencies for known vulnerabilities
```

## Creating an EVE Frontier Dapp

Build your dApp on [`@evefrontier/dapp-kit`](./packages/libs/dapp-kit/README.md). Its README covers installation, providers and hooks, and the full API reference is at [sui-docs.evefrontier.com](https://sui-docs.evefrontier.com/). The [assembly dApp](./packages/apps/assembly) is a working example.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to open issues and pull requests.

**PR titles** must follow [Conventional Commits](https://www.conventionalcommits.org/), for example `feat(dapp-kit): add entity parser` or `fix: icon fallback`. PRs are squash-merged with the PR title as the commit message, and the Semantic Pull Request workflow checks titles on pull requests into `main`. Following the same format for individual commit messages is encouraged.

**Git hooks** are installed by Husky on `bun install`:

- `pre-commit` runs lint across all packages.
- `pre-push` runs `bun audit` and the dapp-kit tests.

## Releasing

Releases are cut from GitHub releases and tags. The tag must match the package's `version` in its `package.json`, or the workflow fails.

**`@evefrontier/dapp-kit`**

1. Bump the version in `packages/libs/dapp-kit/package.json` and update its `CHANGELOG.md`.
2. Publish a GitHub release tagged `dapp-kit/v<version>`.
   - [`publish-dapp-kit.yaml`](./.github/workflows/publish-dapp-kit.yaml) tests, builds and publishes the package to GitHub Packages. Releases marked as pre-releases are not published.
   - [`docs.yaml`](./.github/workflows/docs.yaml) deploys the TypeDoc site.

**Assembly dApp**

1. Bump the version in `packages/apps/assembly/package.json` and update its `CHANGELOG.md`.
2. Push a tag `dapp/v<version>`.
   - [`image.yaml`](./.github/workflows/image.yaml) scans the sources with Grype, then builds one Caddy-served container image per tier (`dev`, `test`, `uat`, `live`) and architecture (`amd64`, `arm64`).
   - Tier configuration is baked into each bundle at build time. Images are pushed to ECR as `<version>-<tier>-<arch>`.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
