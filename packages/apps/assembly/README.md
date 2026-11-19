# EVE Frontier Smart Assembly Base

EVE Frontier Smart Assembly Base is a client-only dapp framework designed for seamless integration with the EVE Frontier game.

## Table of Contents

1. [Project Overview](#project-overview) 🌟
2. [Dependencies](#dependencies) 🔗
3. [Getting Started](#getting-started) 🚀
4. [Documentation](#documentation) 📚
5. [License](#license) 📜

## Project Overview

EVE Frontier Smart Assembly Base is a client-only dapp framework designed for seamless integration with the EVE Frontier game. It provides blockchain functionality via Dapp Kit and manages blockchain-based data states efficiently. The project is built with TypeScript, Material UI, Tailwind CSS, and Vite.

### Dependencies

- Node.js 26.13.1 and Bun 1.4.4, plus a `GITHUB_TOKEN` for GitHub Packages (see the [root README](../../../README.md#prerequisites))
- OneKey or EVE Vault wallet connected to Sui testnet

## Getting Started

To get a local copy of the project up and running, follow these simple steps.

1.  **Clone the Repository**

    ```bash
    git clone https://github.com/evefrontier/eve-frontier-dapps.git
    cd eve-frontier-dapps/packages/apps/assembly
    ```

2.  **Install Packages**

    ```bash
    bun install
    ```

3.  **Set Up Environment Variables**

    Sample values are available in `.envsample`.

    Copy `.envsample` to `.env` and update the values:

    ```bash
    cp .envsample .env
    ```

    Optionally, pass a Sui object ID directly in the `.env` file:

    ```
    VITE_OBJECT_ID=
    ```

4.  **Run the Development Server**

    ```bash
    bun run dev
    ```

5.  **View the Live App**

    Visit `http://localhost:3000` in your browser to see the app in action.

### Development Commands

```bash
bun run lint          # Check for linting issues
bun run lint:fix      # Fix issues automatically
```

**Deployment**

Pushing a `dapp/v<version>` tag builds a container image per tier and architecture. See [Releasing](../../../README.md#releasing) in the root README.

### Documentation

Further documentation on the Smart Assembly Base dApp is available at the [EVE Frontier Docs](https://docs.evefrontier.com/Dapp/quick-start).

## License

This project is licensed under the MIT License. See the [LICENSE](../../../LICENSE) file for details.
