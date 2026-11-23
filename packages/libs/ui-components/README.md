# @eveworld/ui-components

## EVE Frontier UI Components Library

Shared React UI for EVE Frontier dApps, styled with Tailwind CSS. It is down to what the assembly dapp still uses: the error notice and the base stylesheet. The assembly dapp's own screens (the grid console) live in the app.

## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
3. [Styling](#styling)
4. [License](#license)

## Installation

```bash
bun add @eveworld/ui-components
```

## Usage

```tsx
import { ErrorNotice, ErrorNoticeTypes } from '@eveworld/ui-components'

<ErrorNotice
  type={ErrorNoticeTypes.MESSAGE}
  errorMessage="Anomaly detected: See developer console for details"
/>
```

`ErrorNoticeTypes.SMART_ASSEMBLY` shows "Assembly not found" in an `EveContainer` frame instead of the message.

## Styling

Import the stylesheet once, at the root of the app:

```tsx
import '@eveworld/ui-components/styles.css'
```

It brings in Tailwind CSS with the EVE Frontier theme (colours such as `neutral`, `martianred`, `crude`; the `font-favorit` and `font-disket` families), the base page styles and the classes the components use. Tailwind scans the library's `components` folder itself (`@source`), so no extra configuration is needed.

## License

This project is licensed under the MIT License. See the [LICENSE](../../../LICENSE) file for details.
