# Penalty Grid

Penalty Grid is a real-time football party game where friends use player knowledge to score, predict, and save penalties in shared private rooms.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Validation: Zod 3 and generated request schemas
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/penalty-grid/` — React game client and stadium UI.
- `artifacts/api-server/src/lib/rooms.ts` — authoritative in-memory rooms, turn progression, timers, and WebSockets.
- `artifacts/api-server/src/lib/football.ts` — structured football data and answer validation.
- `lib/api-spec/openapi.yaml` — REST room contract.

## Architecture decisions

- The API server owns the match state and only reveals player selections when rules allow it.
- Private rooms use short codes and reconnectable browser sessions; the first release intentionally keeps active rooms in memory.
- Football validation uses a versioned roster snapshot and reports its freshness rather than claiming unverified live data.

## Product

- Create or join private rooms with a short code.
- Ready up, start a match, choose a target, predict the shot, and answer football-player criteria.
- Server validation supports aliases and prevents the goalkeeper reusing the shooter’s answer.
- Scores, timers, player-cap rules, reveals, sudden death, reconnecting state, and rematches are synchronized live.
- Player search suggests roster entries with visual profile graphics and a displayed roster freshness date.

## User preferences

- Build functional experiences rather than mocks or placeholder flows.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
