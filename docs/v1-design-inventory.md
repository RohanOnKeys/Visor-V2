# Visor v1 Design Inventory

This document records the reusable visual design elements found in Visor v1.
It is an inventory only. It does not implement or commit V2 interface code.

Reference repository: [RohanOnKeys/Visor](https://github.com/RohanOnKeys/Visor)

## 1. Visual Identity

Visor v1 uses a dark, technical interface with a bright green signal color.
The design feels compact, agent-oriented, and slightly cyberpunk without
depending on heavy visual effects.

The recurring visual characteristics are:

- Black page backgrounds
- Dark gray cards and controls
- Bright green highlights
- White and gray text hierarchy
- Circular logo and icon controls
- Rounded rectangular panels
- Pill-shaped buttons and status badges
- Green focus rings and subtle green glows
- Monospace text for selectors, URLs, JSON, and debug information
- Dense information layouts with small labels

## 2. Brand Assets

### Visor logo

Source:

```text
public/visor-logo.png
```

Description:

- Square green background
- Black geometric visor/glasses mark
- Used as a circular image in the popup, options page, preview page, and widget
- Common rendered sizes: 42, 44, 52, and 72 pixels
- Often displayed with `border-radius: 999px`

Recommended V2 use:

- Extension icon and primary brand mark
- Floating browser-control button
- Connection/onboarding screens

### Extension icons

Sources:

```text
public/icons/icon-16.png
public/icons/icon-32.png
public/icons/icon-48.png
public/icons/icon-128.png
```

Recommended V2 use:

- Preserve as the initial Chrome extension icon set
- Revisit only if V2 needs visible mode-specific icon variants

### Documentation banner

Sources:

```text
docs/assets/visor.banner.png
docs/assets/visor-readme-banner.svg
```

Description:

- Black matrix-like background
- Green Visor wordmark and geometric visor symbol
- Stronger cyberpunk styling than the product UI

Recommended V2 use:

- README and launch material
- Not as an application background

### Third-party agent logos

Sources:

```text
public/llm-chatgpt.png
public/llm-claude.png
public/llm-gemini.png
public/llm-grok.png
```

V1 use:

- Direct-export buttons
- Radial floating export widget

V2 decision:

- Do not treat these as core design assets.
- Keep them out of the main MCP browser-control interface.
- Reconsider only if optional provider-specific integrations return later.

## 3. Color Palette

### Core surfaces

| Token concept | V1 value | Usage |
|---|---:|---|
| Main background | `#000000` | Pages and popup background |
| Card surface | `#121212` | Panels and cards |
| Input surface | `#181818` | Inputs, selects, code areas |
| Elevated surface | `#242424` | Hovered secondary controls |
| Green-tinted surface | `#101a14` | Focused and hovered inputs |

### Text

| Token concept | V1 value |
|---|---:|
| Primary text | `#ffffff` |
| Secondary text | `#d6d6d6` |
| Muted text | `#a7a7a7` |

### Signal colors

| Token concept | V1 value | Usage |
|---|---:|---|
| Primary green | `#1ed760` | Primary action and active state |
| Green hover | `#1fdf64` | Primary button hover |
| Secondary green | `#1db954` | Secondary accent |
| Dark green ink | `#001409` | Text/icons on green controls |
| Warning | `hsl(38, 92%, 50%)` | Medium-risk state |
| Danger | `hsl(346, 84%, 55%)` | Errors and high-risk state |

### Borders and overlays

| Purpose | V1 value |
|---|---:|
| Default border | `rgba(255, 255, 255, 0.1)` |
| Green border glow | `rgba(30, 215, 96, 0.55)` |
| Active tab background | `rgba(30, 215, 96, 0.14)` |
| Selection background | `rgba(30, 215, 96, 0.34)` |
| Focus ring | `rgba(30, 215, 96, 0.24)` |

## 4. Typography

### Sans-serif stack

```css
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
"Segoe UI", sans-serif
```

Uses:

- All interface copy
- Buttons
- Form controls
- Headings

### Monospace stack

```css
"Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace
```

Uses:

- JSON
- Markdown output
- URLs
- Selectors
- Debug data
- Blocked-domain input

### Common type sizes

| Size | Typical use |
|---:|---|
| 10–11 px | Eyebrows, metadata, badges |
| 12–13 px | Supporting text, URLs, debug text |
| 14–15 px | Standard controls and body copy |
| 16–20 px | Panel and section headings |
| 24–32 px | Page titles |

## 5. Shape and Elevation

### Radius scale

| Radius | Typical use |
|---:|---|
| 4–6 px | Small tags and code previews |
| 8 px | Compact cards and table rows |
| 10–12 px | Inputs and grouped controls |
| 18 px | Main glass panels |
| 999 px | Buttons, icons, switches, risk pills |

### Main panel shadow

```css
0 18px 48px rgba(0, 0, 0, 0.45)
```

### Floating control shadow

```css
0 12px 32px rgba(0, 0, 0, 0.36),
0 0 22px rgba(30, 215, 96, 0.22)
```

### Motion

V1 uses fast, restrained transitions:

```css
0.15s cubic-bezier(0.16, 1, 0.3, 1)
0.3s cubic-bezier(0.16, 1, 0.3, 1)
```

Common effects:

- One-pixel upward movement on hover
- Small scale increase on floating controls
- Green border and glow on focus
- Radial expansion for widget actions

## 6. Reusable Control Patterns

### Primary button

- Bright green background
- Dark green/black text
- Bold label
- Pill shape
- Slight lift and green shadow on hover

### Secondary button

- Transparent background
- Thin gray border
- White text
- Elevated gray background on hover

### Danger button

- Red background or red outlined variant
- Used for reset and deletion

### Circular icon button

- 38-pixel circular control
- Green translucent background
- Green border and icon
- Becomes solid green on hover

### Form field

- Dark input surface
- 12-pixel radius
- Green border on hover/focus
- Green caret and accent color
- Two-pixel translucent focus ring

### Custom select

- 52-pixel trigger in the popup
- Green chevron
- Dark menu
- Selected/hovered option becomes solid green

### Number stepper

- Text input with attached vertical plus/minus buttons
- Shared rounded container
- Green-tinted hover and focus treatment

### Toggle switch

- 46 × 26 pixels
- Gray when disabled
- Solid green when enabled
- Dark circular thumb in the enabled state

### Risk tag

- Uppercase 10–11 pixel label
- Pill shape
- Transparent semantic background
- Matching semantic border and text
- Low: green
- Medium: amber
- High: red

## 7. Layout Patterns

### Popup

V1 dimensions:

- Body width: 432 pixels
- Main shell width: 420 pixels
- Maximum height: 600 pixels
- Shell padding: 16 pixels
- Vertical gap: 14 pixels

Structure:

1. Logo and settings icon
2. Current-tab identity
3. Widget status/toggle
4. Two-column mode and privacy controls
5. Token budget
6. Primary compile action
7. Result/error panels
8. Export controls

V2 reuse candidates:

- Compact fixed-width shell
- Current-tab identity section
- Status row
- Two-column configuration controls
- Full-width primary action

### Options page

V1 layout:

- Maximum width: 1200 pixels
- Two-column grid
- Left column for defaults, blocked domains, and reset
- Right column for site profiles and editing
- 24-pixel section gaps

V2 reuse candidates:

- Two-column control-panel structure
- Panel grouping
- Domain profile list
- Danger-zone separation

### Preview dashboard

V1 layout:

- Maximum width: 1400 pixels
- Header summary panel
- Status badges aligned to the right
- 240-pixel navigation sidebar
- Large tabbed content panel
- Stats displayed in a four-column grid

V2 reuse candidates:

- Observation and protocol diagnostics dashboard
- Sidebar navigation
- Structured action table
- Stat tiles
- Raw JSON and log panels

## 8. Floating Widget

V1 widget characteristics:

- Runs inside a shadow root
- Fixed near a viewport corner
- 46-pixel circular main control
- Uses the Visor logo
- Highest practical z-index
- Draggable after a short press
- Remembers its position in session storage
- Expands controls radially
- Flips expansion direction near viewport edges
- Closes with Escape
- Uses green border glow and black shadows

V2 reuse candidates:

- Shadow-root isolation
- Draggable placement
- Saved position
- Viewport-aware expansion
- Circular primary control
- Status glow
- Escape-to-close behavior

V2 behavior replacement:

- Replace LLM export shortcuts with:
  - connection status
  - interaction mode
  - pending action summary
  - approve once
  - deny
  - stop agent

## 9. Accessibility Elements Present in V1

- Buttons use `aria-label` where their purpose is not visible.
- Custom select uses listbox and option roles.
- Widget controls have titles and accessible labels.
- Toggle uses `role="switch"` and `aria-checked`.
- Main widget supports Escape to close.
- Text colors generally maintain strong contrast on black surfaces.

Items to improve later:

- Do not communicate status through color alone.
- Add visible keyboard focus to all custom controls.
- Avoid 10-pixel text for essential information.
- Add reduced-motion handling.
- Ensure custom select keyboard behavior is complete.
- Give pending confirmations a clear focus-management flow.

## 10. Files Containing V1 Design

| V1 file | Design content |
|---|---|
| `src/index.css` | Global tokens and shared controls |
| `src/popup/index.tsx` | Popup composition and compact controls |
| `src/options/index.tsx` | Control-panel and profile layouts |
| `src/preview/index.tsx` | Dashboard, sidebar, tables, stat cards |
| `src/content/widget.ts` | Floating widget visuals and motion |
| `public/visor-logo.png` | Primary brand mark |
| `public/icons/*` | Extension icon set |
| `docs/assets/*` | README and documentation branding |

## 11. Recommended Preserve / Change Decisions

### Preserve

- Visor logo and icon family
- Black and green palette
- Typography stacks
- Panel, button, input, and risk-tag styling
- Compact popup proportions
- Options and diagnostics layout concepts
- Floating shadow-root widget mechanics

### Change

- Remove third-party LLM branding from the core V2 interface
- Replace export terminology with observe, confirm, act, and verify
- Use amber for pending confirmation
- Use red for blocked/stopped/disconnected states
- Reduce inline styles by introducing semantic component classes
- Add explicit connection and agent-control states

### Defer

- Exact V2 popup composition
- New widget implementation
- React component extraction
- Asset copying
- CSS package creation
- Visual redesign or new illustrations
