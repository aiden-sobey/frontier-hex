# Frontier Hex

A full-featured, real-time multiplayer board game that challenges players to accumulate resources and take control of the frontier, built with modern web technologies.
Play in your browser against friends or AI bots with a PixiJS-rendered hex board, real-time updates via WebSockets, and a pure TypeScript game engine.

## Features

- Interactive hex board rendered with PixiJS
- Real-time multiplayer via Socket.IO
- AI bots with strategic decision-making
- Snake draft setup phase
- Responsive UI with Tailwind CSS

## Tech Stack

| Layer      | Technology              |
| ---------- | ----------------------- |
| Framework  | TanStack Start (Vite 7) |
| UI         | React 19                |
| Rendering  | PixiJS v8 + @pixi/react |
| State      | Zustand v5              |
| Realtime   | Socket.IO v4            |
| Styling    | Tailwind CSS v4         |
| Validation | Zod                     |
| Language   | TypeScript              |
| Testing    | Vitest                  |
| Linting    | ESLint + Prettier       |

## Prerequisites

- Node.js >= 22
- pnpm >= 10

## Getting Started

```bash
# Install dependencies
pnpm install

# Start the dev server (http://localhost:3000)
pnpm dev
```

## Scripts

```bash
pnpm dev            # Start dev server on port 3000
pnpm build          # Production build → .output/
pnpm start          # Run production server (.output/server/index.mjs)
pnpm test           # Run all tests (vitest)
pnpm lint           # ESLint (src/)
pnpm format         # Prettier (write)
pnpm format:check   # Prettier (check only)
```

## Project Structure

```
src/
  engine/            # Pure TS game engine (no DOM/React deps)
    __tests__/       # Engine + bot tests
    validators/      # Per-action validate() + apply() modules
    actions.ts       # Central validateAction() / applyAction() dispatch
    board.ts         # BoardGraph construction, hex geometry
    types.ts         # All game types, enums, interfaces
  canvas/            # PixiJS rendering (HexGrid, HexTile, Vertex, Edge, etc.)
  components/
    game/            # Game UI (ResourceBar, TradeDialog, BuildMenu, etc.)
    ui/              # Generic UI primitives (Button, Modal)
  stores/            # Zustand stores (game-store, ui-store)
  routes/            # TanStack Router file-based routes
  server-only/       # Server-side: Socket.IO handlers, bot AI, room management
  functions/         # TanStack server functions
  hooks/             # React hooks
  lib/               # Shared utilities
```

## Architecture

### Game Engine

The engine (`src/engine/`) is a pure TypeScript module with zero framework dependencies. All game logic flows through two functions:

1. **`validateAction(state, action)`** — returns an error string or `null`
2. **`applyAction(state, action)`** — returns `{ state, events }`

Each action type (build, trade, roll dice, play dev card, etc.) has a corresponding validator module in `validators/` exporting `validate()` and `apply()` functions.

### Real-time Communication

Socket.IO connects the browser to the game server. In development, the Socket.IO server attaches to Vite's dev server via a custom plugin (`configureServer` hook). Game actions are validated server-side and broadcast to all players in the room.

### Bot AI

Bots (`src/server-only/bot-strategy.ts`) use a priority-based strategy:

- **Setup**: Score vertices by pip count, resource diversity, and port access
- **Main phase**: Build cities > settlements > roads > dev cards, then bank trade excess resources
- **Trade evaluation**: Need-based resource valuation — bots accept trades that help them toward their goals
- **Robber**: Target hexes that hurt opponents the most while avoiding own buildings
- **Dev cards**: Play knights to move the robber, road building for expansion, year of plenty / monopoly for resources
