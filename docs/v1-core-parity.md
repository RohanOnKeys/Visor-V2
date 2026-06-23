# V1 Core Parity Baseline — Phase 0 Complete

Updated: June 23, 2026

## Scope

This baseline covers the reusable Visor V1 core migrated into the V2 workspace:

- Page snapshot and agent-context contracts
- Zod runtime schemas
- Privacy threat analysis and redaction
- Compiler classification, normalization, noise filtering, scoring, budgeting,
  mode shaping, export formatting, and structured-field redaction
- DOM selector hints and visibility heuristics
- DOM extraction for headings, text, links, actions, forms, tables, media,
  layout groups, open shadow roots, accessible iframes, site profiles, node
  limits, and Wikipedia semantic regions
- Extension settings, site profiles, recent compile history, and clear-all
  behavior
- Non-interactive MV3 service worker and content script
- Reproducible unpacked-extension packaging with inherited Visor icons

## Preserved Safety Behavior

- Password and one-time-code values are never extracted.
- JWTs and supported API-key patterns are redacted at every privacy level.
- Email addresses are redacted at medium and strict levels.
- Phone numbers are redacted at strict level.
- High-risk page signals disable external sharing in the compiled context.
- Invalid site-profile selectors are reported and ignored safely.
- Extraction stops after the V1 12,000-node cap.

## Verification

The following commands pass:

```text
npm run build
npm run typecheck
npm test
npm audit
```

Current automated result:

```text
11 test files passed
38 tests passed
0 known npm vulnerabilities
```

DOM extraction tests use jsdom only as a development dependency. It is not
part of the extension runtime.

## Chrome Load Verification

The generated unpacked extension was launched in an isolated local Chrome
profile with only the Visor extension explicitly enabled.

Chrome exposed the Visor MV3 service worker through its local debugging target:

```text
chrome-extension://fignfifoniblkonapihmkfakmlgkbkcf/service-worker.js
```

The temporary Chrome profile was removed after verification.

## Phase 0 Result

Phase 0 is complete:

- V1 core parity is established.
- Settings storage is migrated.
- The non-interactive extension builds and packages.
- Package permissions and referenced assets are tested.
- Chrome accepts the unpacked extension and starts its service worker.

The project can now proceed to Phase 1: the read-only MCP vertical slice.
