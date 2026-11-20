# @eveworld/assembly

## 0.4.0

### Minor Changes

- Breaking: `VITE_EVE_WORLD_TIER` (dev | test | uat | ptu | live) replaces `VITE_EVE_WORLD_PACKAGE_ID` in `.env`, the Docker build arg and the image workflow
- the app reads world-contracts entities through dapp-kit; assembly views show their empty state until they move to `entity`
- the wallet's character is no longer looked up, and the network node monitor no longer applies fuel efficiency
- Updated dependencies
  - @evefrontier/dapp-kit@0.2.0-alpha.0

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
