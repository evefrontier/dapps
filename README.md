# EVE Frontier Decentralized Applications 🚀

This is the monorepo for the decentralized applications of EVE Frontier on Sui and support libraries.

## Table of Contents 📋

1. [Project Overview](#project-overview) 🌟
2. [Dependencies](#dependencies) 🔗
3. [Getting Started](#getting-started) 🚀
4. [Building Packages](#building-packages) 🛠️
5. [Deploying a Decentralized Application](#deploying-a-decentralized-application) 🌐
6. [Other Useful Commands](#other-useful-commands) 🔧
7. [Creating an EVE Frontier Dapp](#creating-an-eve-frontier-dapp) 🏗️
8. [Releasing to Production](#releasing-to-production) 🚢
9. [License](#license) 📜

## Project Overview 🌟

This monorepo contains the decentralized applications (dApps) of EVE Frontier, along with support libraries ([`@evefrontier/dapp-kit`](./packages/libs/dapp-kit/README.md), `@eveworld/ui-components`).

## Dependencies 🔗

This monorepo is an Nx-configured pnpm workspace. By running `pnpm install` from the root, you can install dependencies for the entire monorepo.

## Getting Started 🚀

To install all dependencies, run:

```bash
pnpm install
```

## Building Packages 🛠️

Nx can be used to invoke build commands for each package directly from the project root.

To build all packages, run:

```bash
npx nx run-many -t build
```

To build a specific package, use the target script flag:

```bash
npx nx run @eveworld/assembly:build
```

## License 📜

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
