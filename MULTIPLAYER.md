# Arcade City 3D Multiplayer — v1.2.2

Arcade City v1.2.2 uses WebSockets with an automatic HTTPS polling fallback for private 2–6 player rooms. Both transports share the same rooms and player sessions.

## Local test

1. Install Node.js 20 or newer.
2. In this repository, run:
   `npm install`
3. Start the server:
   `npm start`
4. Open:
   `http://localhost:8080/arcade-city.html`
5. Open the game in a second browser/device on the same reachable server, then create/join the same room code.

When the game and server are served from the same hostname, Arcade City automatically uses `/ws`. If connecting takes more than four seconds, the socket fails, or room updates stop for eight seconds, it switches to `/mp/exchange` over HTTPS. No server address entry is needed.

## Hosting

Deploy this repository as a Node web service.

- Install/build command: `npm install`
- Start command: `npm start`
- Health check: `/health`
- WebSocket path: `/ws`
- HTTPS fallback: `POST /mp/exchange`

Share the game URL served by this Node service. The full fallback flow requires the game and backend on the same origin. The temporary Cloudflare link works only while the laptop and tunnel are online; its availability is not guaranteed after sleep or restart.

## v1.2.2 fixes

- Typing names and room codes no longer triggers driving shortcuts.
- Existing players appear immediately when a new player joins.
- Session tokens preserve room membership across transport changes; repeated create/join requests are idempotent.
- Disconnected sessions have a 60-second recovery window before cleanup.
- HTTPS requests time out and retry, then show an actionable error after five consecutive failures.
- Missing and full rooms show explicit errors.
- Game HTML revalidates instead of retaining a stale release; server source and dependencies are not public assets.

With the server running, use `npm run test:multiplayer` for protocol regression tests. To check a hosted server, append `-- https://your-game-host.example`. The test creates temporary rooms and removes its players afterward.

## v1.2 scope

- Private room codes only
- 2–6 human players
- Synced position, heading, speed, car paint and basic car style state
- Player names over remote cars
- Remote players on the minimap
- Join/leave cleanup
- Periodic room snapshots for recovery from missed updates
- Single-player continues working if the server is offline

Multiplayer races, shared police/traffic simulation, parties, and matchmaking are intentionally left for later versions.

