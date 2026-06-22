# Visor v2

**A secure MCP browser runtime for AI agents.**

Visor v2 connects AI agents to the user's real Chrome session through the Model Context Protocol (MCP). It allows an agent to understand a webpage, interact with visible controls, and verify the result while keeping the user in control of sensitive actions.

Visor v2 evolves the original [Visor DOM Context Compiler](https://github.com/RohanOnKeys/Visor) from a page-understanding extension into an interactive browser layer for agents.

> Visor v2 is currently in the architecture and implementation-planning stage. Development will happen in a separate repository after the plan is approved.

## What Visor Does

Visor gives an MCP-compatible agent a controlled browser loop:

1. **Observe** the active page as structured, privacy-aware context.
2. **Understand** headings, content, forms, controls, tables, links, and page state.
3. **Act** by clicking, filling, selecting, scrolling, navigating, or pressing keys.
4. **Verify** the resulting URL, page state, visible changes, or screenshot.
5. **Repeat** until the task is complete or user approval is required.

Instead of asking agents to invent fragile CSS selectors, Visor assigns temporary opaque references to visible elements:

```json
{
  "elementId": "el_01J2YJ8F2M7..."
}
```

These references are tied to a specific tab, frame, document, and observation generation. They automatically expire when the page changes.

## Architecture

```text
┌──────────────────────────────┐
│ MCP Client                   │
│ Codex / Claude / other agent │
└──────────────┬───────────────┘
               │ MCP over stdio
               ▼
┌────────────────────────────────────────┐
│ Visor MCP Server                       │
│                                        │
│ - MCP tools                            │
│ - request validation                   │
│ - action-policy preflight              │
│ - localhost WebSocket bridge           │
└──────────────┬─────────────────────────┘
               │ authenticated WebSocket
               │ ws://127.0.0.1
               ▼
┌────────────────────────────────────────┐
│ Visor Chrome Extension                 │
│                                        │
│ Service worker                         │
│ - relay connection                     │
│ - tab and navigation control           │
│ - confirmations and audit log          │
│                                        │
│ Content script                         │
│ - DOM extraction and compilation       │
│ - stable element registry              │
│ - action execution                     │
│ - post-action verification             │
└────────────────────────────────────────┘
```

The extension cannot expose an MCP server directly, so a small local Node.js process acts as the bridge. MCP clients communicate with that process over standard input/output, while the Chrome extension connects to it as an authenticated WebSocket client.

## Planned MCP Tools

### Observe

- `browser_observe`
- `browser_get_active_tab`
- `browser_list_tabs`
- `browser_screenshot`
- `browser_get_status`
- `browser_get_capabilities`

### Interact

- `browser_click`
- `browser_fill`
- `browser_select`
- `browser_focus`
- `browser_press_key`
- `browser_scroll`
- `browser_submit`
- `browser_wait_for`

### Navigate

- `browser_navigate`
- `browser_go_back`
- `browser_go_forward`
- `browser_reload`
- `browser_open_tab`
- `browser_switch_tab`
- `browser_close_tab`

Mutation tools return a structured verification summary describing whether the page changed, navigation occurred, new alerts appeared, or a fresh observation is needed.

## Interaction Modes

### Observe

Read-only access. Agents can inspect pages but cannot change browser state.

This is the default mode on installation.

### Confirm

Agents can request state-changing actions. Visor evaluates each request and asks the user to approve sensitive or consequential actions.

Confirmations are bound to the exact:

- tab
- page generation
- action
- target element
- parameters

If the page changes before approval, the confirmation expires.

### Autonomous

Low-risk actions may run automatically on domains explicitly approved by the user.

High-risk actions still require confirmation by default, and the user always has access to an emergency stop control.

## Safety and Privacy

Moving from reading pages to acting inside authenticated sessions creates a serious trust boundary. Safety is part of Visor's architecture, not an optional layer.

Visor v2 will:

- Bind its bridge only to `127.0.0.1`.
- Authenticate the extension with a high-entropy shared token.
- Validate the Chrome extension origin.
- Validate every MCP and bridge message at runtime.
- Preserve Visor v1's local privacy redaction.
- Preserve blocked domains and site-specific profiles.
- Treat webpage content as untrusted data.
- Keep settings, policies, and audit records local.
- Redact sensitive values from logs and tool responses.
- Reject stale page and element references.
- Require approval for sensitive or consequential actions.

Confirmation is required by default for:

- Passwords, OTPs, recovery codes, API keys, and secrets
- Payments, purchases, and checkout
- Sending messages, emails, posts, or comments
- Deleting or irreversibly modifying data
- Account, security, permission, and sharing changes
- Uploads and downloads
- Browser permission prompts
- Final submissions with external side effects

Visor will not bypass CAPTCHAs, browser security restrictions, paywalls, or permission controls.

## Reusing Visor v1

Visor v2 will preserve and extend the strongest parts of [Visor v1](https://github.com/RohanOnKeys/Visor):

- DOM snapshot extraction
- Visibility detection
- Selector tracing
- Page classification
- Content normalization and noise filtering
- Importance scoring
- Token-budget shaping
- Compact, detailed, agent, RAG, and debug modes
- Privacy redaction and threat detection
- Zod schemas and shared TypeScript contracts
- Blocked-domain settings
- Site profiles
- Popup, options, preview, and in-page widget designs
- Compiler, privacy, schema, and acceptance tests

The existing compiler remains independent of Chrome APIs so it can be tested and reused as a standalone package.

## Proposed Repository Structure

```text
visor-v2/
├── apps/
│   ├── extension/
│   └── mcp-server/
├── packages/
│   ├── compiler/
│   ├── extractor/
│   ├── privacy/
│   ├── protocol/
│   ├── schemas/
│   └── testing/
├── docs/
├── package.json
└── pnpm-workspace.yaml
```

The shared protocol and schema packages ensure that the MCP server and extension use the same versioned contracts.

## Development Roadmap

### Phase 0 — V1 parity

- Create the separate v2 repository.
- Migrate reusable v1 components.
- Port v1 tests and fixtures.
- Confirm equivalent compiler and privacy behavior.

### Phase 1 — Read-only MCP bridge

- MCP server over stdio
- Authenticated localhost WebSocket bridge
- Extension reconnect handling
- `browser_get_status`
- `browser_get_active_tab`
- `browser_observe`

### Phase 2 — Stable element references

- Opaque element IDs
- Tab, frame, document, and generation scoping
- Stale-element detection
- Interactive observation mode

### Phase 3 — Low-risk actions

- Click
- Fill
- Native select
- Focus and key presses
- Scroll and wait
- Post-action verification

### Phase 4 — Confirmation and policy

- Confirm mode
- Confirmation interface
- Action-risk classification
- Domain approvals
- Emergency stop
- Local audit log

### Phase 5 — Navigation and tabs

- Navigation history
- Open, list, switch, and close tabs
- New-tab and popup handling

### Phase 6 — Rich verification

- Screenshots
- Observation differences
- Dialog and alert reporting
- Element highlighting

### Phase 7 — Autonomous mode

- Domain-scoped autonomy
- Action and rate limits
- Failure circuit breakers
- Persistent autonomous-state indicator

### Phase 8 — Packaging

- MCP server CLI
- Extension package
- Pairing and onboarding
- Client configuration examples
- Release and security documentation

## First Useful Release

The first useful release is complete when an MCP agent can:

1. Connect to Visor.
2. Observe the active Chrome tab.
3. Receive stable references for visible controls.
4. Request a low-risk click or fill action.
5. Trigger visible confirmation.
6. Execute the approved action.
7. Verify the resulting page state.
8. Record the operation in a local audit log.

## Current Status

- [x] Product direction defined
- [x] Visor v1 component inventory completed
- [x] Architecture and security model designed
- [x] MCP tool surface planned
- [x] Phased implementation plan written
- [ ] Separate Visor v2 repository created
- [ ] V1 parity migration started
- [ ] Read-only MCP vertical slice implemented
- [ ] Interactive action runtime implemented

## License

The license for Visor v2 will be selected and documented when the separate repository is created. Reused Visor v1 code must retain any applicable copyright and license notices.
