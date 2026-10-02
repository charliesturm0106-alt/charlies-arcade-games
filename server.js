'use strict';

const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = Number(process.env.PORT || 8080);
const MAX_PLAYERS = 6;
const PUBLIC_MAX_PLAYERS = 24;
const PUBLIC_PREFIX = 'CITY';
const WORLD_LIMIT = 500;
const rooms = new Map();
const sessions = new Map();
const VERSION = '2.1.1';

const app = express();
app.disable('x-powered-by');
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'arcade-city-multiplayer',
    version: VERSION,
    rooms: rooms.size,
    players: [...rooms.values()].reduce((n, room) => n + room.size, 0)
  });
});
// The main arcade is on GitHub Pages; allow its HTTPS fallback to this server.
app.use('/mp/exchange', (req, res, next) => {
  if (req.headers.origin === 'https://neonsarcade32.github.io') {
    res.set('Access-Control-Allow-Origin', req.headers.origin);
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '8kb' }));
app.post('/mp/exchange', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const { token, message } = req.body || {};
  if (!validToken(token)) return res.status(400).json({ error: 'Invalid session.' });
  const peer = getPeer(token);
  if (!peer) return res.status(503).json({ error: 'Server busy. Try again.' });
  peer.lastSeen = Date.now();
  if (peer.socket) { const old = peer.socket; peer.socket = null; old.close(); }
  if (message) receive(peer, message);
  if (!peer.roomCode && (!message || message.type === 'state')) send(peer, { type: 'error', message: 'Room connection expired. Join the room again.' });
  const messages = peer.queue.splice(0);
  if (peer.roomCode) messages.push({ type: 'snapshot', players: roomPlayers(peer.roomCode) });
  res.json({ messages });
});
// Script transport for iPad/iOS browsers. Cross-origin <script> loads do not require CORS.
app.get('/mp/jsonp', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.type('application/javascript');
  const token = String(req.query.token || '');
  const reply = payload => {
    const safe = JSON.stringify({ token, ...payload })
      .replace(/</g, '\\u003c')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
    res.send('window.__arcadeMpReceive&&window.__arcadeMpReceive(' + safe + ');');
  };
  if (!validToken(token)) return reply({ error: 'Invalid session.' });
  const peer = getPeer(token);
  if (!peer) return reply({ error: 'Server busy. Try again.' });
  peer.lastSeen = Date.now();
  let message = null;
  if (req.query.message) {
    try { message = JSON.parse(String(req.query.message)); } catch (_) { return reply({ error: 'Bad message.' }); }
  }
  if (message) receive(peer, message);
  if (!peer.roomCode && (!message || message.type === 'state')) {
    send(peer, { type: 'error', message: 'World connection expired. Join again.' });
  }
  const messages = peer.queue.splice(0);
  if (peer.roomCode) messages.push({ type: 'snapshot', players: roomPlayers(peer.roomCode) });
  reply({ messages });
});
// Serve only public game assets, never server source or dependencies.
app.use((req, res, next) => {
  if (req.path !== '/' && !/^\/[^/]+\.(html|css|png|jpg|svg|ico)$/.test(req.path) && req.path !== '/new-games.js') return res.sendStatus(404);
  next();
});
app.use(express.static(__dirname, { dotfiles: 'ignore', index: 'index.html', maxAge: 0, setHeaders: res => res.setHeader('Cache-Control', 'no-cache') }));

const server = http.createServer(app);
const wss = new WebSocketServer({
  server,
  path: '/ws',
  maxPayload: 8 * 1024
});

function cleanName(value) {
  const name = String(value || 'Driver')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .slice(0, 16);
  return name || 'Driver';
}

function cleanRoom(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
}

function finite(value, fallback = 0, min = -Infinity, max = Infinity) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
}

function cleanColor(value) {
  return Math.floor(finite(value, 0x56dfff, 0, 0xffffff));
}

function publicPlayer(player) {
  return {
    id: player.id,
    name: player.name,
    x: player.x,
    z: player.z,
    heading: player.heading,
    speed: player.speed,
    car: player.car,
    color: player.color,
    wheels: player.wheels,
    spoiler: player.spoiler,
    racing: player.racing,
    chapter: player.chapter,
    raceId: player.raceId,
    wanted: player.wanted,
    district: player.district
  };
}

function roomPlayers(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return [];
  return [...room.values()].map(entry => publicPlayer(entry.player));
}

function send(ws, payload) {
  if (ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify(payload));
  } catch (_) {}
}

function broadcast(roomCode, payload, except = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const raw = JSON.stringify(payload);
  for (const [ws] of room) {
    if (ws === except || ws.readyState !== WebSocket.OPEN) continue;
    try {
      ws.send(raw);
    } catch (_) {}
  }
}

function leaveRoom(ws) {
  const roomCode = ws.roomCode;
  if (!roomCode) return;

  const room = rooms.get(roomCode);
  if (!room) {
    ws.roomCode = '';
    return;
  }

  const entry = room.get(ws);
  room.delete(ws);
  ws.roomCode = '';

  if (room.size === 0) {
    rooms.delete(roomCode);
    return;
  }

  broadcast(roomCode, {
    type: 'playerLeft',
    id: entry?.player?.id || '',
    players: roomPlayers(roomCode)
  });
}

function publicRoomCode() {
  let n = 1;
  while ((rooms.get(PUBLIC_PREFIX + n)?.size || 0) >= PUBLIC_MAX_PLAYERS) n++;
  return PUBLIC_PREFIX + n;
}
function joinRoom(ws, mode, data) {
  const isPublic = mode === 'public';
  const roomCode = isPublic ? publicRoomCode() : cleanRoom(data.room);
  if (ws.roomCode === roomCode && rooms.get(roomCode)?.has(ws)) {
    send(ws, { type: 'joined', id: rooms.get(roomCode).get(ws).player.id, room: roomCode, maxPlayers: MAX_PLAYERS, players: roomPlayers(roomCode) });
    return;
  }
  if (!isPublic && roomCode.length < 4) {
    send(ws, { type: 'error', message: 'Room code must be 4–6 letters/numbers.' });
    return;
  }

  const exists = rooms.has(roomCode);
  if (!isPublic && mode === 'create' && exists) {
    send(ws, { type: 'error', message: 'That room already exists. Try another code.' });
    return;
  }
  if (!isPublic && mode === 'join' && !exists) {
    send(ws, { type: 'error', message: 'Room not found.' });
    return;
  }

  if (!exists) rooms.set(roomCode, new Map());
  const room = rooms.get(roomCode);

  const roomLimit = isPublic ? PUBLIC_MAX_PLAYERS : MAX_PLAYERS;
  if (room.size >= roomLimit) {
    send(ws, { type: 'error', message: isPublic ? 'Public world is busy. Reconnect to enter another world.' : 'Room is full (6 players max).' });
    return;
  }

  leaveRoom(ws);
  const player = {
    id: crypto.randomUUID(),
    name: cleanName(data.name),
    x: -225,
    z: -215,
    heading: 0,
    speed: 0,
    car: String(data.car || 'street86').slice(0, 20),
    color: cleanColor(data.color),
    wheels: 0,
    spoiler: 1,
    racing: false,
    chapter: Math.floor(finite(data.chapter, 1, 1, 5)),
    raceId: String(data.raceId || '').slice(0, 24),
    wanted: Math.floor(finite(data.wanted, 0, 0, 5)),
    district: String(data.district || 'DOWNTOWN').replace(/[^A-Z0-9 _-]/gi, '').slice(0, 24),
    updatedAt: Date.now()
  };

  room.set(ws, { player });
  ws.roomCode = roomCode;

  send(ws, {
    type: 'joined',
    id: player.id,
    room: roomCode,
    maxPlayers: roomLimit,
    public: isPublic,
    players: roomPlayers(roomCode)
  });

  broadcast(
    roomCode,
    {
      type: 'playerJoined',
      player: publicPlayer(player),
      players: roomPlayers(roomCode)
    },
    ws
  );
}

function updateState(ws, data) {
  const room = rooms.get(ws.roomCode);
  const entry = room?.get(ws);
  if (!entry) return;

  const p = entry.player;
  p.x = finite(data.x, p.x, -WORLD_LIMIT, WORLD_LIMIT);
  p.z = finite(data.z, p.z, -WORLD_LIMIT, WORLD_LIMIT);
  p.heading = finite(data.heading, p.heading, -Math.PI * 4, Math.PI * 4);
  p.speed = finite(data.speed, p.speed, -100, 100);
  p.car = String(data.car || p.car).slice(0, 20);
  p.color = cleanColor(data.color);
  p.wheels = Math.floor(finite(data.wheels, p.wheels, 0, 2));
  p.spoiler = Math.floor(finite(data.spoiler, p.spoiler, 0, 2));
  p.racing = !!data.racing;
  p.chapter = Math.floor(finite(data.chapter, p.chapter || 1, 1, 5));
  p.raceId = String(data.raceId || p.raceId || '').slice(0, 24);
  p.wanted = Math.floor(finite(data.wanted, p.wanted || 0, 0, 5));
  p.district = String(data.district || p.district || 'DOWNTOWN').replace(/[^A-Z0-9 _-]/gi, '').slice(0, 24);
  p.updatedAt = Date.now();

  broadcast(ws.roomCode, { type: 'state', player: publicPlayer(p) }, ws);
}

function validToken(token) { return typeof token === 'string' && /^[a-f0-9-]{36}$/.test(token); }
function getPeer(token) {
  if (sessions.has(token)) return sessions.get(token);
  if (sessions.size >= 1000) return null;
  const peer = { readyState: WebSocket.OPEN, roomCode: '', queue: [], socket: null, lastSeen: Date.now(), lastStateAt: 0,
    send(raw) {
      if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(raw);
      else { this.queue.push(JSON.parse(raw)); if (this.queue.length > 100) this.queue.shift(); }
    }
  };
  sessions.set(token, peer);
  return peer;
}
function receive(peer, data) {
  if (!data || typeof data.type !== 'string') return;
  if (data.type === 'create' || data.type === 'join' || data.type === 'public') return joinRoom(peer, data.type, data);
  if (data.type === 'leave') return leaveRoom(peer);
  if (data.type === 'state' && Date.now() - peer.lastStateAt >= 25) {
    peer.lastStateAt = Date.now(); updateState(peer, data);
  }
}
wss.on('connection', (socket, req) => {
  const token = new URL(req.url, 'http://localhost').searchParams.get('token') || crypto.randomUUID();
  if (!validToken(token)) return socket.close(1008, 'Invalid session');
  const peer = getPeer(token);
  if (!peer) return socket.close(1013, 'Server busy');
  if (peer.socket) peer.socket.close();
  peer.socket = socket; peer.lastSeen = Date.now();
  for (const message of peer.queue.splice(0)) send(peer, message);
  socket.on('pong', () => { peer.lastSeen = Date.now(); });
  socket.on('message', raw => {
    if (peer.socket !== socket) return;
    peer.lastSeen = Date.now();
    try { receive(peer, JSON.parse(raw.toString())); } catch (_) {}
  });
  socket.on('close', () => { if (peer.socket === socket) peer.socket = null; });
  socket.on('error', () => {});
});
const heartbeat = setInterval(() => {
  for (const [token, peer] of sessions) {
    if (Date.now() - peer.lastSeen > 60000) {
      leaveRoom(peer); peer.socket?.terminate(); sessions.delete(token);
    } else if (peer.socket?.readyState === WebSocket.OPEN) peer.socket.ping();
  }
}, 10000);

const snapshots = setInterval(() => {
  for (const roomCode of rooms.keys()) {
    broadcast(roomCode, {
      type: 'snapshot',
      players: roomPlayers(roomCode)
    });
  }
}, 2000);

wss.on('close', () => {
  clearInterval(heartbeat);
  clearInterval(snapshots);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Arcade City multiplayer listening on port ${PORT}`);
});

