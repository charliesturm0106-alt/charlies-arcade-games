'use strict';

const path = require('path');
const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = Number(process.env.PORT || 8080);
const MAX_PLAYERS = 6;
const WORLD_LIMIT = 500;
const rooms = new Map();

const app = express();
app.disable('x-powered-by');
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'arcade-city-multiplayer',
    rooms: rooms.size,
    players: [...rooms.values()].reduce((n, room) => n + room.size, 0)
  });
});
app.use(express.static(__dirname, { dotfiles: 'ignore', index: 'index.html' }));

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
    racing: player.racing
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

function joinRoom(ws, mode, data) {
  leaveRoom(ws);

  const roomCode = cleanRoom(data.room);
  if (roomCode.length < 4) {
    send(ws, { type: 'error', message: 'Room code must be 4–6 letters/numbers.' });
    return;
  }

  const exists = rooms.has(roomCode);
  if (mode === 'create' && exists) {
    send(ws, { type: 'error', message: 'That room already exists. Try another code.' });
    return;
  }
  if (mode === 'join' && !exists) {
    send(ws, { type: 'error', message: 'Room not found.' });
    return;
  }

  if (!exists) rooms.set(roomCode, new Map());
  const room = rooms.get(roomCode);

  if (room.size >= MAX_PLAYERS) {
    send(ws, { type: 'error', message: 'Room is full (6 players max).' });
    return;
  }

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
    updatedAt: Date.now()
  };

  room.set(ws, { player });
  ws.roomCode = roomCode;

  send(ws, {
    type: 'joined',
    id: player.id,
    room: roomCode,
    maxPlayers: MAX_PLAYERS,
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
  p.updatedAt = Date.now();

  broadcast(ws.roomCode, { type: 'state', player: publicPlayer(p) }, ws);
}

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.roomCode = '';
  ws.lastMessageAt = 0;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', raw => {
    if (raw.length > 8 * 1024) return;

    const now = Date.now();
    if (now - ws.lastMessageAt < 25) return;
    ws.lastMessageAt = now;

    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch (_) {
      return;
    }

    if (!data || typeof data.type !== 'string') return;

    if (data.type === 'create' || data.type === 'join') {
      joinRoom(ws, data.type, data);
      return;
    }

    if (data.type === 'state') {
      updateState(ws, data);
      return;
    }

    if (data.type === 'leave') {
      leaveRoom(ws);
    }
  });

  ws.on('close', () => leaveRoom(ws));
  ws.on('error', () => leaveRoom(ws));
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      leaveRoom(ws);
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch (_) {}
  }
}, 20000);

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
