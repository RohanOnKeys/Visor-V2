# Visor v1 Migration Inventory

Reference: `RohanOnKeys/Visor` at V1 commit `473bcda`.

## Package Mapping

| V1 source | V2 destination | State |
|---|---|---|
| `src/shared/types.ts` | `packages/protocol` | Started |
| `src/shared/schema.ts` | `packages/schemas` | Started |
| `src/compiler/*` | `packages/compiler` | Utilities started |
| `src/content/extractor.ts` | `packages/extractor` | Pending |
| `src/content/selectors.ts` | `packages/extractor` | Started |
| `src/content/visibility.ts` | `packages/extractor` | Started |
| `src/privacy/*` | `packages/privacy` | Threat rules started |
| `src/storage/settings.ts` | `apps/extension/src/storage` | Pending |
| `src/background/service-worker.ts` | extension services | Pending split |
| popup/options/preview/widget | extension UI | Pending |
| V1 tests and fixtures | `packages/testing` and package-local tests | Pending |

## Preserved V1 Behaviors

- DOM extraction and source ordering
- selector diagnostics
- semantic visibility checks
- page classification
- normalization, filtering, and scoring
- token targeting
- privacy redaction and risk reporting
- schema validation
- blocked domains and site profiles
- restricted-page handling

## New V2 Boundaries

- MCP and WebSocket bridge contracts live in `@visor/protocol`.
- Runtime validation lives in `@visor/schemas`.
- Browser access remains in the extension.
- MCP transport and process lifecycle remain in the Node server.
- Stable element identity is separate from selector hints.
- Action policy is evaluated before content-script execution.
