# Arcade City 3D Multiplayer — v1.2

Arcade City v1.2 uses a small Node.js WebSocket server for private 2–6 player rooms.

## Local test

1. Install Node.js 20 or newer.
2. In this repository, run:
   `npm install`
3. Start the server:
   `npm start`
4. Open:
   `http://localhost:8080/arcade-city.html`
5. Open the game in a second browser/device on the same reachable server, then create/join the same room code.

When the game and server are served from the same hostname, Arcade City automatically uses `/ws`.

## Hosting

Deploy this repository as a Node web service.

- Install/build command: `npm install`
- Start command: `npm start`
- Health check: `/health`
- WebSocket path: `/ws`

If the game stays on GitHub Pages while the multiplayer server is hosted somewhere else, paste that server's secure WebSocket address into Multiplayer, for example `wss://your-host.example/ws`.

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
