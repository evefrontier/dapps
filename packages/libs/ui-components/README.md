# @eveworld/ui-components

The grid console's UI kit: the views, primitives and stylesheet that draw the assembly dapp, in the Creation Builder's language (diamond tab rail, breaker board, levers, hold button, corner brackets). It has no chain or wallet code: every view takes plain props (strings, rows and callbacks), so the app that uses it holds the business logic and passes in what to show.

It is built for the assembly dapp, and some of its text describes how today's world contracts behave (for example the main breaker's). It is private to this repo and not published.

## Table of Contents

1. [Installation](#installation)
2. [Styling](#styling)
3. [Views](#views)
4. [Primitives](#primitives)
5. [The props rule](#the-props-rule)
6. [License](#license)

## Installation

It is a workspace package. Add it to an app in this repo with:

```json
"@eveworld/ui-components": "workspace:*"
```

The `@eveworld/ui-components` on npm (0.0.12 and earlier) is the old component library, not this one.

## Styling

Import the stylesheet once, at the root of the app:

```tsx
import '@eveworld/ui-components/console.css'
```

Everything is scoped under `.gc` (the console) and `.gc-toast-host` (the toast), which also hold the colour and font tokens (`--ink`, `--brand`, `--offline`, `--font-display`, `--font-body`…). The console's breakpoints are container queries on its own width: desktop from 1024px, tablet 768–1023px, mobile below. The toast sits outside the console, so its phone layout is a media query. The fonts (Frontier Disket Mono, Favorit) are not bundled; load them in the page.

## Views

| View | Draws |
|---|---|
| `ConsoleView` | The frame: top bar (role chip, wallet or Connect), in-flight strip, identity slot, tab rail and tab content; or a note when there is nothing to show |
| `ConsolePanel` | One tab's content with no frame, or a note, for hosts that draw their own (the game client) |
| `IdentityView` | Code, name, state lamp, description and key-value rows; an edit icon and an `editor` slot |
| `DetailsFormView` | The Edit details form (name, description, dapp URL), controlled |
| `MainBreakerView` | The main breaker: a lever with the hold-to-cut-power box, or a lamp plate |
| `GridView` | Readouts, banner, fuel panel and the board of breaker cards; a `breaker` slot |
| `AirlockView` | One card per airlock, with contents when given |
| `DappView` | The attached dapp in a sandboxed iframe, or why it isn't shown |
| `AccessView` | The Controllers list and the add form, controlled |
| `ToastView` | The transaction toast: Sending, Done or Failed |
| `ErrorNotice` | A full-page error, for an error boundary's fallback |

## Primitives

`TabRail` (and the `ConsoleTab` type), `HoldButton`, `Lever`, `Plate`, `Ornament`, `EditIcon` and `CloseIcon`.

## The props rule

A view never reads chain data, flags or the wallet, and never sends a transaction. It takes what to show as props and reports what the viewer did through callbacks. Anything the app needs to read, such as a form's draft or a search query, is a controlled prop. The only state a view keeps is purely visual: whether the hold box, the add form or a toast's details are open, the hold button's progress, and focus.

```tsx
<MainBreakerView
  on={grid.on}
  writable={canManage(role)}
  locked={pending || entity.inFlight}
  onSwitch={(next) => send(next)}
/>
```

## License

This project is licensed under the MIT License. See the [LICENSE](../../../LICENSE) file for details.
