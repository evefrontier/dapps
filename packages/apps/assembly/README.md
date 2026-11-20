# EVE Frontier Smart Assembly Base

EVE Frontier Smart Assembly Base is a client-only dapp framework designed for seamless integration with the EVE Frontier game.

## Table of Contents

1. [Project Overview](#project-overview) 🌟
2. [Dependencies](#dependencies) 🔗
3. [Roles and permissions](#roles-and-permissions) 🔑
4. [Getting Started](#getting-started) 🚀
5. [Documentation](#documentation) 📚
6. [License](#license) 📜

## Project Overview

EVE Frontier Smart Assembly Base is a client-only dapp framework designed for seamless integration with the EVE Frontier game. It provides blockchain functionality via Dapp Kit and manages blockchain-based data states efficiently. The project is built with TypeScript, Material UI, Tailwind CSS, and Vite.

### Dependencies

- Node.js 26.13.1 and Bun 1.4.4, plus a `GITHUB_TOKEN` for GitHub Packages (see the [root README](../../../README.md#prerequisites))
- OneKey or EVE Vault wallet connected to Sui testnet

## Roles and permissions

The dapp works out what the connected wallet may do with the assembly and shows only the controls for that. It does not explain the permission model on screen. This section does.

| Can                                    | Visitor | Controller | Shell |
| -------------------------------------- | :-----: | :--------: | :---: |
| See state, power, fuel and modules     |   Yes   |    Yes     |  Yes  |
| See who the shell is                   |   Yes   |    Yes     |  Yes  |
| See the controller list                |    –    |    Yes     |  Yes  |
| See airlock contents (items)           |    –    |    Yes     |  Yes  |
| Switch the main breaker (power grid)   |    –    |    Yes     |  Yes  |
| Switch module and generator breakers   |    –    |     –      |   –   |
| Edit name, description and dapp URL    |    –    |    Yes     |  Yes  |
| Add and remove controllers             |    –    |    Yes     |  Yes  |
| Remove the shell from the list         |    –    |     –      |   –   |

How the role is worked out:

- **Shell**: the connected wallet is the one holding the entity's AccessCap (`entityOwner.walletAddress` from `useSmartObject`). The shell is what used to be called the owner.
- **Controller**: the wallet's character id is in the entity's access list (`entity.controllers`). Controllers are character ids, not wallets, so the wallet is first resolved to its character with `useCharacterDirectory`.
- **Visitor**: anyone else, including a session with no wallet connected. Visitors see the same screens with a lamp in place of the main breaker lever, no edit icon, and who the shell is, but no Access tab and no controller count. In the Airlock tab (shown when the assembly has an airlock, an inventory component on chain) they see how full each airlock is, never what it holds.

The shell and controllers get the same console, and it writes only three things: the main breaker, the name, description and dapp URL, and the Controllers list. Sections, modules, generators and airlocks are read-only for everyone, shown exactly as visitors see them; module and generator switching stays in the game. The Access tab has one Controllers list; the shell is on it in its own place, tagged Shell, and its entry has no Remove button, so the shell can never take itself off the list. Controllers are added by pasting the wallet address bound to a character; there is no search, and a character id is not accepted. A wallet with no character is rejected; the character id the wallet is bound to is what reaches the access list.

Airlock contents and the controller list are public on chain: anyone can query them. Hiding them from visitors keeps them off the dapp's screen; it does not make them private.

On chain, permissions are checked per action: each action on the entity names the requirement it checks (for example `power_grid::OperateGrid` for the main breaker). In today's world-contracts every grid operation also requires the shell (`access_cap::Owner`), so the controller column depends on the access list changing that.

While the entity has a transaction in flight (`entity.inFlight`), every control is locked for everyone until it settles.

The dapp does not deposit fuel. Fuel arrives through the game's inventory-in action.

Feature flags:

- `assembly-controllers` shows the controller list and lets the shell and controllers add and remove controllers. Off by default; it needs the access-list contract and sponsored actions.
- The main breaker is planned and not built yet. Module and generator breakers are display only.
- Editing the name, description and dapp URL saves all three in one `UPDATE_METADATA` transaction (`EditUnit.tsx`). Today only the shell can save; opening it to controllers is planned.

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
