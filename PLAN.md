# Rock · Paper · Scissors: Formations — Roadmap

## Phase 1 — Project Scaffold + Local Simulation [DONE]
- npm workspaces: `shared`, `server`, `client`
- All of `shared/` (types, constants, combat, formations, protocol, economy)
- `GameSimulation.ts` with all 7 systems (Movement, Combat, Formation, Merge, Economy, Zone, WinCondition)
- Stub renderer: colored canvas circles that move and fight
- Vitest passes combat, formation, and merge tests

## Phase 2 — Rendering Pipeline (Pixi.js) [DONE]
- Camera (pan WASD + middle-mouse drag, scroll zoom)
- Unit sprites: Rock = circle, Paper = square, Scissors = triangle
- Formation outlines, zone shapes on map, HP bars
- Resource bar UI (3 separate bars: Rock/Paper/Scissors)
- Merge progress indicator, hit flash + death fade effects

## Phase 3 — Player Input + Selection [DONE]
- Box-select (drag rectangle), click-select, Shift add/remove
- Control groups Ctrl+1–9 / 1–9 recall
- Right-click move/attack-move, right-click on enemy to attack
- Formation create: select units → F key assigns formation shape
- Z/X/C spawn units, U upgrade (merge trigger)
- InputBackend abstraction: LocalBackend + NetworkBackend

## Phase 4 — WebSocket Server + Basic Multiplayer [DONE]
- Express HTTP + `ws` WebSocket server
- FIFO matchmaking queue (2 players → GameRoom)
- GameRoom: setInterval tick loop, snapshot broadcast
- Client connects, receives snapshots, renders via StateBuffer interpolation
- Inputs sent from client, applied server-side via input queue
- Main menu: Practice (LocalGame) vs Find Match (OnlineGame)
- OnlineGame: connecting → waiting → matched → playing state machine

## Phase 5 — Reconnect + Networking Polish [DONE]
- [x] SessionStore with 60s TTL (server/src/net/SessionStore.ts)
- [x] Auto-reconnect with exponential backoff on client (500ms → 8s)
- [x] Server clock sync: 5-ping median → serverTimeOffset, used in StateBuffer + sample()
- [x] Input validation: bounds check, ownership check, rate limit 10 inputs/tick
- [x] Room cleanup after game ends (60s grace period for reconnect)

## Phase 6 — Economy, Zones, Win Condition [DONE]
- [x] Type-specific resource pools (Rock pts / Paper pts / Scissors pts)
- [x] Per-unit passive income: each unit generates 1 pt/income-tick for its matching pool
- [x] Zone capture: correct unit type captures 2× faster (ZONE_CAPTURE_BONUS)
- [x] Zone income bonuses feed matching resource pool (INCOME_ZONE_BONUS = 3 per owned zone)
- [x] Base HP, base auto-attacks nearby enemies (BASE_ATTACK_RANGE = 1500, BASE_DAMAGE = 20)
- [x] Win screen on base destruction or zone domination (30s hold all 3 zones)

## Phase 7 — Merge System + Tier 3 [DONE]
- [x] MergeSystem: detect 10 same-type same-tier units within MERGE_RADIUS
- [x] Merge animation: units converge → burst → single large unit (gold ring effect)
- [x] Tier 3 evolution (Tier 2 × 10 → Tier 3)
- [x] Formation slot spacing scales with tier (SLOT_SPACING per tier already defined)
- [x] Slot reassignment after merge (empty formations pruned, new unit unassigned)

## Phase 8 — Deployment + Mobile + Polish [DONE]
- [x] Dockerfile for Railway deploy (multi-stage builder → lean production runner)
- [x] railway.json config (DOCKERFILE builder, /health check, restart policy)
- [x] Production URL auto-detection: wsUrl() derives from location.host — no env vars needed
- [x] express.static serves client/dist when NODE_ENV=production (SPA fallback included)
- [x] npm run build root script: shared → client → server in dependency order
- [x] Mobile touch: 1-finger tap = select unit or move-to; 1-finger drag = box-select
- [x] Mobile touch: 2-finger drag = camera pan; 2-finger pinch = zoom (Camera.ts)
- [x] canvas touch-action:none + user-select:none prevents browser interference
- [x] Responsive canvas already handled by Pixi resizeTo:window in PixiApp
- [ ] Delta snapshot compression — deferred (out of scope for v1)
- [ ] Cross-browser compatibility testing — do after first Railway deploy
