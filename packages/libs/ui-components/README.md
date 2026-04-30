# @eveworld/ui-components

## EVE Frontier UI Components Library

This package contains the UI Component library for EVE Frontier dApps. Built with TypeScript, Material UI, and Tailwind CSS, it offers a range of reusable components that are easy to integrate into EVE Frontier dApps.

## Table of Contents

1. [Installation](#installation) 📦
2. [Usage](#usage) 🔧
3. [Styling with Tailwind CSS](#styling-with-tailwind-css) 🎨
4. [Components](#components) 🧩
5. [License](#license) 📜

## Installation 📦

To install the library, run the following command:

```bash
bun add @eveworld/ui-components
```

## Usage 🔧

To use a component from this library, import it into your project:

```typescript
import { SmartAssemblyInfo } from "@eveworld/ui-components";
```

Then use it in your React component:

```jsx
<SmartAssemblyInfo />
```

## Styling with Tailwind CSS 🎨

This library utilizes Tailwind CSS for styling. To ensure that the styles are properly applied, the `tailwind.config.js` file must be configured to include the path to this component library.

### Configuring Tailwind

Add the path to the UI component library in the `content` array of `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    // ...other file paths
    "./node_modules/@eveworld/ui-components/**/*.{js,ts,jsx,tsx}",
  ],
  // ...other Tailwind configurations
};
```

This step is necessary for Tailwind to process the classes used in the library.

## Components 🧩

The library includes a variety of components designed for EVE Frontier dApps. Some of the key components are:

```
<ClickToCopy />
<ConnectWallet />
<ErrorNotice />
<EveAlert />
<EveButton />
<EveLayout />
<EveLinearBar />
<EveLoadingAnimation />
<EveScroll />
<Header />
<SmartAssemblyInfo />
<EveInput />
```

### Component Props and Types

Some components require props that are defined using types from the `@eveworld/types` package. To use these components, ensure you import the necessary types.

Example:

```typescript
import { SmartAssemblyInfo } from "@eveworld/ui-components";
import { Assembly } from "@eveworld/types";

const smartAssemblyData: Assembly = {
  // populate with required data
};

const App = () => (
  <div>
    <SmartAssemblyInfo {...smartAssemblyData} />
  </div>
);
```

## Static Assets 🖼️

The library also includes static SVG assets that can be accessed from `@eveworld/ui-components/assets`. These assets can be used for icons, logos, and other visual elements in your application.

To use an SVG asset, import it into your project like this:

```typescript
import { Logo } from '@eveworld/ui-components/assets';

const App = () => (
  <div>
    <Logo />
  </div>
);
```

## License 📜

This project is licensed under the MIT License. See the [LICENSE](../../../LICENSE) file for details.
