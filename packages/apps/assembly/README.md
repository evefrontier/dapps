# EVE Frontier Smart Assembly Base

EVE Frontier Smart Assembly Base is a client-only dapp framework designed for seamless integration with the EVE Frontier game.

## Table of Contents

1. [Project Overview](#project-overview) 🌟
2. [Dependencies](#dependencies) 🔗
3. [Getting Started](#getting-started) 🚀
4. [Testing](#testing) 🧪
5. [Documentation](#documentation) 📚
6. [License](#license) 📜

## Project Overview 🌟

EVE Frontier Smart Assembly Base is a client-only dapp framework designed for seamless integration with the EVE Frontier game. It provides blockchain functionality via Dapp Kit and manages blockchain-based data states efficiently. The project is built with TypeScript, Material UI, Tailwind CSS, and Vite.

### Dependencies 🔗

- Node.js (v18+)
- pnpm v8 (install via `npm install --global pnpm@8`)
- OneKey or EVE Vault wallet connected to `https://devnet-data-sync.nursery.reitnorf.com`

## Getting Started 🚀

To get a local copy of the project up and running, follow these simple steps.

1.  **Clone the Repository**

    ```bash
    git clone https://github.com/evefrontier/eve-frontier-dapps.git
    cd eve-frontier-dapps/packages/apps/assembly
    ```

2.  **Install Packages**

    ```bash
    pnpm install
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
    pnpm run dev
    ```

5.  **View the Live App**

    Visit `http://localhost:3000` in your browser to see the app in action.

### Development Commands

```bash
pnpm lint          # Check for linting issues
pnpm lint:fix      # Fix issues automatically
```

**Deployment**

This project is automatically deployed to AWS Amplify. The deployment is configured to build from the latest commit on each of the following branches:

- `live` - Production / Live tier environment
- `uat` - Staging environment
- `test` - Test environment
- `dev`

Each branch will automatically trigger a new build and deployment when changes are pushed. The build process includes:

1. Installing dependencies
2. Running tests
3. Building the application
4. Deploying to the corresponding AWS Amplify environment

### Documentation 📚

Further documentation on the Smart Assembly Base dApp is available at the [EVE Frontier Docs](https://docs.evefrontier.com/Dapp/quick-start).

## License 📜

This project is licensed under the MIT License. See the [LICENSE](../../../LICENSE) file for details.
