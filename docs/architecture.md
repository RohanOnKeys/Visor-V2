# Visor v2 Architecture

## Dependency Direction

```text
protocol  ← schemas
    ↑          ↑
    ├── extractor
    ├── privacy
    ├── compiler
    ├── extension
    └── mcp-server

extractor ──→ protocol
privacy  ──→ protocol (after V1 privacy report types migrate)
compiler ──→ protocol + schemas + privacy
extension ─→ protocol + schemas + extractor + compiler
mcp-server → protocol + schemas
```

The dependency graph must remain acyclic. Chrome APIs are restricted to
`apps/extension`; Node APIs and MCP transports are restricted to
`apps/mcp-server`.

## Runtime Boundary

The MCP server communicates over stdio with an MCP client and hosts an
authenticated WebSocket server bound to `127.0.0.1`. The extension service
worker connects as a client and routes validated commands to the correct tab
and frame.

The content script owns DOM observation, element registration, and action
execution. It never receives raw MCP messages and never makes policy decisions
on its own.

## Migration Rule

V1 behavior is migrated before it is redesigned:

1. Port a V1 component with its tests.
2. Confirm parity.
3. Move shared contracts into `@visor/protocol`.
4. Add v2 behavior behind a new versioned schema.
5. Keep V1 schema compatibility until the v2 consumer no longer needs it.
