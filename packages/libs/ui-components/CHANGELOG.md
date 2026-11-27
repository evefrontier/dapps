# @eveworld/ui-components

## 0.3.1

### Patch Changes

- update fuel maths for v1.1.16

## 0.3.0

### Minor Changes

- The grid console's UI kit. Breaking: the old components are gone.

  - The package is marked private: it belongs to this repo and is not published to npm.
  - Added the grid console's views (`ConsoleView`, `IdentityView`, `DetailsFormView`, `MainBreakerView`, `GridView`, `AirlockView`, `DappView`, `AccessView`, `ToastView`), its primitives (`TabRail`, `HoldButton`, `Lever`, `Plate`, `Ornament`, `EditIcon`, `CloseIcon`) and `console.css`. Views take plain props and have no chain or wallet code.
  - `ErrorNotice` is restyled in the console's look and now takes `message` (and an optional `title`); `ErrorNoticeTypes` is removed.
  - Removed every other component and module (`EveAlert`, `EveButton`, `EveInput`, `EveLayout`, `Header`, `EveContainer`, `GateView`, `TurretView`, `InventoryView`, `Graph`, the skeletons and the rest), the SVG assets and `styles.css`.
  - Dropped MUI, Emotion, Tailwind CSS, `@base_ui/react`, `@visx/*`, `react-router-dom`, `@mysten/wallet-standard` and `@evefrontier/dapp-kit`; the package now depends on React only.

## 0.2.1

### Patch Changes

- add digichem unpacking

## 0.2.0

### Minor Changes

- World api url update

### Patch Changes

- Updated dependencies
  - @evefrontier/dapp-kit@0.2.0

## 0.2.0

### Minor Changes

- 7991953: june release ui style
- june release

### Patch Changes

- Updated dependencies
  - @eveworld/types@0.1.0
  - @eveworld/utils@0.1.0

## 0.0.9

### Patch Changes

- update types to match world v2
- Updated dependencies
  - @eveworld/utils@0.0.10

## 0.0.8

### Patch Changes

- Fix versioning
- Updated dependencies
  - @eveworld/types@0.0.8
  - @eveworld/utils@0.0.8

## 0.0.3

### Patch Changes

- Internal package update
- Updated dependencies
  - @eveworld/assets@0.0.3
  - @eveworld/contexts@0.0.3
  - @eveworld/types@0.0.3
  - @eveworld/utils@0.0.3

## 0.0.2

### Patch Changes

- Initial publish
- Updated dependencies
  - @eveworld/assets@0.0.2
  - @eveworld/contexts@0.0.2
  - @eveworld/types@0.0.2
  - @eveworld/utils@0.0.2
