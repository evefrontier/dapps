# @eveworld/assembly

## 0.4.1

### Patch Changes

- update fuel maths for v1.1.16
- Updated dependencies
  - @eveworld/ui-components@0.3.1
  - @evefrontier/dapp-kit@0.2.0-alpha.1

## 0.4.0

### Minor Changes

- Breaking: `VITE_EVE_WORLD_TIER` (dev | test | uat | ptu | live) replaces `VITE_EVE_WORLD_PACKAGE_ID` in `.env`, the Docker build arg and the image workflow
- Breaking: the Dapp Index fallback is removed, with `VITE_DAPP_INDEX_URL`, its Docker build arg and the `assembly-dapp-index-fallback` flag
- the old assembly views are replaced by one screen, the grid console, which reads world-contracts entities through dapp-kit and opens without a wallet. It has no routes; its tabs are Dapp, Grid, Airlock and Access
- the console works out whether the wallet is the shell, a controller or a visitor and shows only that role's controls (see Roles and permissions in the README)
- the shell and controllers can switch the main breaker, edit the name, description and dapp URL, and add and remove controllers. The breaker and controller transactions fail at the wallet until their contract and wallet-core support lands (see Status in the README)
- each transaction reports in one toast, Sending and then Done or Failed, in place of the `EveAlert` notices; the console stays locked until the entity is refetched
- new flags: `assembly-controller-search` and `assembly-edit-without-metadata`, and, in dev and test builds, `assembly-view-as` and `assembly-show-dapp`
- MUI, Tailwind CSS, PostCSS and SVGR are dropped; everything the app draws, and `console.css`, comes from `@eveworld/ui-components`
- Updated dependencies
  - @evefrontier/dapp-kit@0.2.0-alpha.0
  - @eveworld/ui-components@0.3.0

## 0.3.10

### Patch Changes

- 1b31d17: amplify image build

## 0.3.9

### Patch Changes

- Updated dependencies
  - @eveworld/ui-components@0.2.1

## 0.3.8

### Patch Changes

- Updated dependencies
  - @evefrontier/dapp-kit@0.1.10
  - @eveworld/ui-components@0.2.1

## 0.3.7

### Patch Changes

- feature flag: dapp index

## 0.3.7

### Patch Changes

- add feature flags

## 0.3.6

### Patch Changes

- fix icon fallback

## 0.3.5

### Patch Changes

- add pagination

## 0.3.4

### Patch Changes

- apply fuel optimistic update, bump wallet-core version

## 0.3.3

### Patch Changes

- Updated dependencies
  - @evefrontier/dapp-kit@0.1.11
  - @eveworld/ui-components@0.2.1

## 0.3.2

### Patch Changes

- update wallet-core version

## 0.3.1

### Patch Changes

- use newest dapp-kit

## 0.3.0

### Minor Changes

- World api url update

### Patch Changes

- Updated dependencies
  - @eveworld/ui-components@0.2.0
  - @evefrontier/dapp-kit@0.2.0

## 0.2.2

### Patch Changes

- Update dependencies to tailwindv4

## 0.2.1

### Patch Changes

- add fast refresh
