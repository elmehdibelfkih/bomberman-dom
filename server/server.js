 import { WebSocketServer } from 'ws';
import http from 'http';

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bomberman DOM WS server running');
});

const wss = new WebSocketServer({ server });
let clients = new Map(); // id -> { ws, name, colorIndex }

function createRandomMap() {
  // Map presets (odd dimensions recommended)
  const presets = [
    { rows: 13, cols: 15, tile: 32, blockProb: 0.45 },
    { rows: 11, cols: 13, tile: 32, blockProb: 0.5 },
    { rows: 15, cols: 15, tile: 28, blockProb: 0.4 }
  ];
  const preset = presets[Math.floor(Math.random() * presets.length)];
  const { rows: ROWS, cols: COLS, tile: TILE, blockProb } = preset;
  const grid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) grid[r][c] = 1; // border walls
      else if (r % 2 === 0 && c % 2 === 0) grid[r][c] = 1; // pillars
      else grid[r][c] = Math.random() < blockProb ? 2 : 0; // destructible blocks
    }
  }
  const spawns = [
    { r: 1, c: 1 },
    { r: 1, c: COLS - 2 },
    { r: ROWS - 2, c: 1 },
    { r: ROWS - 2, c: COLS - 2 },
  ];
  for (const s of spawns) {
    grid[s.r][s.c] = 0;
    grid[s.r][Math.max(1, Math.min(COLS - 2, s.c + (s.c > 1 ? -1 : 1)))] = 0;
    grid[Math.max(1, Math.min(ROWS - 2, s.r + (s.r > 1 ? -1 : 1)))][s.c] = 0;
  }
  return { rows: ROWS, cols: COLS, tile: TILE, grid, spawns };
}

function broadcast(obj) {
  const data = JSON.stringify(obj);
  for (const c of clients.values()) {
    try { c.ws.send(data); } catch {}
  }
}

function nextColorIndex() {
  const used = new Set([...clients.values()].map(c => c.colorIndex));
  for (let i=0;i<4;i++) if (!used.has(i)) return i;
  return 0;
}

wss.on('connection', (ws) => {
  let id = Math.random().toString(36).slice(2);
  let info = { ws, name: 'anon', colorIndex: nextColorIndex() };

  ws.on('message', (data) => {
    let msg = {};
    try { msg = JSON.parse(data.toString('utf8')); } catch {}

    if (msg.type === 'hello') {
      info.name = String(msg.nickname || 'anon').slice(0, 24);
      clients.set(id, info);
      const players = [...clients.entries()].map(([cid, c]) => ({ id: cid, name: c.name, colorIndex: c.colorIndex }));
      ws.send(JSON.stringify({ type: 'welcome', players }));
      broadcast({ type: 'join', player: { id, name: info.name, colorIndex: info.colorIndex } });
    }

    if (msg.type === 'chat') {
      broadcast({ type: 'chat', from: info.name, text: String(msg.text).slice(0, 200) });
    }

    if (msg.type === 'request-start') {
      const players = [...clients.entries()].map(([cid, c]) => ({ id: cid, name: c.name, colorIndex: c.colorIndex }));
      const map = createRandomMap();
      broadcast({ type: 'start', selfId: id, players, map });
    }
  });

  ws.on('close', () => {
    clients.delete(id);
    broadcast({ type: 'leave', id });
  });
});

const PORT = 8080;
server.listen(PORT, () => console.log('WS server at ws://localhost:' + PORT));
