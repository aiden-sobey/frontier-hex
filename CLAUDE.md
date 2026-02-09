# Catan Online

## Commands

```bash
pnpm dev          # Start dev server on port 3000
pnpm build        # Production build → .output/
pnpm start        # Run production server (.output/server/index.mjs)
pnpm test         # Run all tests (vitest)
pnpm test -- src/engine/__tests__/board.test.ts   # Single test file
pnpm lint         # ESLint (src/)
pnpm format       # Prettier (write)
pnpm format:check # Prettier (check only)
```

## Architecture

**Stack**: TanStack Start v1.159+ on Vite 7, React 19, PixiJS v8, Zustand v5, Socket.IO v4, Tailwind CSS v4, TypeScript.

### Directory Layout

```
src/
  engine/          # Pure TS game engine (no DOM/React deps)
    __tests__/     # Engine + bot tests (vitest)
    validators/    # Per-action validate() + apply() modules
    actions.ts     # Central validateAction() / applyAction() dispatch
    board.ts       # BoardGraph construction, hex geometry
    types.ts       # All game types, enums, interfaces
  canvas/          # PixiJS rendering components (HexGrid, Vertex, Edge, etc.)
  components/      # React UI components
  stores/          # Zustand stores (game-store.ts, ui-store.ts)
  routes/          # TanStack Router file-based routes
    game/$gameId.tsx  # Game page (dynamic route)
  server-only/     # Server-side: Socket.IO handlers, bot AI, room management
  functions/       # TanStack server functions
  hooks/           # React hooks
  lib/             # Shared utilities
  router.tsx       # Router config (exports getRouter())
  server.tsx       # Server entry (exports { fetch })
  client.tsx       # Client entry
  styles.css       # Tailwind entry (@import "tailwindcss")
```

## Game Engine

The engine (`src/engine/`) is pure TypeScript with no framework dependencies. All game logic flows through:

1. `validateAction(state, action)` → returns error string or `null`
2. `applyAction(state, action)` → returns `ActionResult { state, events }`

Each action type has a corresponding validator module in `validators/` exporting `validate()` and `apply()` functions.

### Board Coordinate System

- **Hex grid**: Pointy-top orientation, axial coordinates `(q, r)`, radius-2 board (19 hexes)
- **Vertices**: Identified by `{ q, r, d }` where `d` is `'N'` or `'S'`
- **Edges**: Identified by `{ q, r, d }` where `d` is `'NE'`, `'E'`, or `'SE'`
- **Serialization**: Keys use `vertexKey()`, `edgeKey()`, `hexKey()` helper functions

### BoardGraph

Pre-computed topology with adjacency maps (`vertexToHexes`, `vertexToEdges`, `vertexToVertices`, `edgeToVertices`, `hexToVertices`). All maps are keyed by string (via key helpers). Constructed once at game creation via `buildBoardGraph()`.

### Setup Phase

Snake draft order: `[0, 1, 2, 3, 3, 2, 1, 0]`. Each player places settlement then road per turn.

## Key Conventions

- **Path alias**: `~/` maps to `src/` (configured in tsconfig `paths`)
- **@pixi/react v8**: Must call `extend({ Container, Graphics, Text })` at module scope before using lowercase JSX (`<pixiGraphics>`, `<pixiContainer>`, etc.)
- **TanStack Start v1.159+**: Uses Vite 7 (not Vinxi). Router exports `getRouter()` (not `createRouter()`). Server functions use `.inputValidator()` (not `.validator()`).
- **HeadContent/Scripts**: Import from `@tanstack/react-router` (not `react-start`)
- **Zustand v5**: Stores in `src/stores/` — `game-store.ts` (game state) and `ui-store.ts` (UI state)
- **Socket.IO**: Attaches to dev server via Vite plugin (`socketDevPlugin()` in `vite.config.ts` using `configureServer` hook)
- **Vitest**: Uses separate `vitest.config.ts` to avoid loading the socket dev plugin

## Known Gotchas

- **`$gameId.tsx`**: The `$` in the filename causes issues with bash shell expansion. Quote or escape when referencing in scripts/commands.
- **Socket plugin warning in vitest**: The dev socket plugin emits a benign warning during test runs — can be ignored.
- **BoardGraph Map serialization**: `BoardGraph` uses `Map<string, ...>` fields which don't survive `JSON.stringify`. Use key helper functions for lookups.
- **HeadContent import**: Must come from `@tanstack/react-router`, not `@tanstack/react-start`. Getting this wrong causes runtime errors.
- **`no-explicit-any`**: ESLint enforces `@typescript-eslint/no-explicit-any` as an error.
