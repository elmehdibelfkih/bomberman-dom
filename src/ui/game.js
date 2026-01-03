import { h, state, createFpsMeter } from '../mini-dom.js';

function rect(x, y, w, h) { return { x, y, w, h }; }
function aabb(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

export function Game({ self, players, map }) {
  // Use server-sent synchronized map for multiplayer
  const TILE = map?.tile || 32;
  const ROWS = map?.rows || 13;
  const COLS = map?.cols || 15;
  const grid = (map?.grid && Array.isArray(map.grid)) ? map.grid.map(row => row.slice()) : Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => 0));
  const spawns = map?.spawns || [ { r:1,c:1 }, { r:1,c:COLS-2 }, { r:ROWS-2,c:1 }, { r:ROWS-2,c:COLS-2 } ];

  const [entities, setEntities] = state({ players: [], bombs: [], flames: [], powerups: [] });
  const [running, setRunning] = state(true);
  const fps = createFpsMeter();

  const numPlayers = Math.max(2, Math.min(4, players?.length || 2));
  const initialPlayers = Array.from({ length: numPlayers }, (_, i) => ({
    id: players?.[i]?.id ?? i,
    name: players?.[i]?.name || `P${i+1}`,
    colorIndex: players?.[i]?.colorIndex ?? i,
    x: spawns[i].c * TILE + 1,
    y: spawns[i].r * TILE + 1,
    w: 30, h: 30,
    speed: 2.1,
    bombsMax: 1,
    bombRange: 2,
    lives: 3,
    alive: true,
    keys: { up:false, down:false, left:false, right:false, drop:false }
  }));

  setEntities({ players: initialPlayers, bombs: [], flames: [], powerups: [] });

  // Input for player 0 (demo local)
  window.addEventListener('keydown', (e) => {
    const p = initialPlayers[0];
    if (!p) return;
    if (e.key === 'ArrowUp' || e.key === 'w') p.keys.up = true;
    if (e.key === 'ArrowDown' || e.key === 's') p.keys.down = true;
    if (e.key === 'ArrowLeft' || e.key === 'a') p.keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') p.keys.right = true;
    if (e.key === ' ' || e.key === 'Enter') p.keys.drop = true;
  });
  window.addEventListener('keyup', (e) => {
    const p = initialPlayers[0];
    if (!p) return;
    if (e.key === 'ArrowUp' || e.key === 'w') p.keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 's') p.keys.down = false;
    if (e.key === 'ArrowLeft' || e.key === 'a') p.keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') p.keys.right = false;
    if (e.key === ' ' || e.key === 'Enter') p.keys.drop = false;
  });

  function canWalk(nx, ny) {
    // collision with walls and blocks (not bombs - bombs block center tile)
    const r = Math.floor((ny + 1) / TILE);
    const c = Math.floor((nx + 1) / TILE);
    const tiles = [
      { r: Math.floor((ny) / TILE), c: Math.floor((nx) / TILE) },
      { r: Math.floor((ny + 29) / TILE), c: Math.floor((nx) / TILE) },
      { r: Math.floor((ny) / TILE), c: Math.floor((nx + 29) / TILE) },
      { r: Math.floor((ny + 29) / TILE), c: Math.floor((nx + 29) / TILE) },
    ];
    for (const t of tiles) {
      if (grid[t.r]?.[t.c] === 1 || grid[t.r]?.[t.c] === 2) return false;
    }
    // bombs collision
    for (const b of entities().bombs) {
      const br = Math.floor((b.y) / TILE); const bc = Math.floor((b.x) / TILE);
      const pr = Math.floor((ny + 15) / TILE); const pc = Math.floor((nx + 15) / TILE);
      if (br === pr && bc === pc && !b.passThrough) return false;
    }
    return true;
  }

  function dropBomb(p) {
    const er = Math.floor((p.y + 15) / TILE);
    const ec = Math.floor((p.x + 15) / TILE);
    const existing = entities().bombs.filter(b => Math.floor(b.x/TILE)===ec && Math.floor(b.y/TILE)===er);
    if (existing.length) return;
    const active = entities().bombs.filter(b => b.owner === p.id).length;
    if (active >= p.bombsMax) return;
    const bomb = { id: Math.random().toString(36).slice(2), owner: p.id, x: ec * TILE, y: er * TILE, fuse: 2000, range: p.bombRange, placedAt: performance.now(), passThrough: true };
    setEntities(s => ({ ...s, bombs: [...s.bombs, bomb] }));
    setTimeout(() => { bomb.passThrough = false; }, 250);
  }

  function explode(bomb) {
    // create flames outward until wall or end; destroy blocks and maybe spawn powerups
    const flames = [{ x: bomb.x, y: bomb.y, t: performance.now() }];
    const dirs = [ [0,-1], [0,1], [-1,0], [1,0] ];
    for (const [dx, dy] of dirs) {
      for (let i=1; i<=bomb.range; i++) {
        const rx = bomb.x + dx * TILE * i;
        const ry = bomb.y + dy * TILE * i;
        const r = Math.floor(ry / TILE), c = Math.floor(rx / TILE);
        if (grid[r]?.[c] === 1) break; // wall stops
        flames.push({ x: rx, y: ry, t: performance.now() });
        if (grid[r]?.[c] === 2) {
          // destroy block, chance for powerup
          grid[r][c] = 0;
          if (Math.random() < 0.25) {
            const kind = ['bombs','flames','speed'][Math.floor(Math.random()*3)];
            setEntities(s => ({ ...s, powerups: [...s.powerups, { x: rx, y: ry, kind }] }));
          }
          break; // flame stops at destroyed block
        }
      }
    }
    setEntities(s => ({ ...s, flames: [...s.flames, ...flames] }));
    // damage players in flames immediately
    for (const f of flames) {
      for (const pl of entities().players) {
        if (!pl.alive) continue;
        const pr = Math.floor((pl.y + 15)/TILE), pc = Math.floor((pl.x + 15)/TILE);
        if (Math.floor(f.y/TILE) === pr && Math.floor(f.x/TILE) === pc) {
          pl.lives -= 1; if (pl.lives <= 0) pl.alive = false;
        }
      }
    }
  }

  function update(dt) {
    if (!running()) return;
    // move players
    for (const p of entities().players) {
      if (!p.alive) continue;
      let nx = p.x, ny = p.y;
      const sp = p.speed * dt / 16.67;
      if (p.keys.up) ny -= sp;
      if (p.keys.down) ny += sp;
      if (p.keys.left) nx -= sp;
      if (p.keys.right) nx += sp;
      if (canWalk(nx, p.y)) p.x = nx;
      if (canWalk(p.x, ny)) p.y = ny;
      if (p.keys.drop) { dropBomb(p); p.keys.drop = false; }
    }

    // bombs fuse
    const now = performance.now();
    const toExplode = entities().bombs.filter(b => now - b.placedAt >= b.fuse);
    if (toExplode.length) {
      setEntities(s => ({ ...s, bombs: s.bombs.filter(b => !toExplode.includes(b)) }));
      for (const b of toExplode) explode(b);
    }

    // flames decay
    setEntities(s => ({ ...s, flames: s.flames.filter(f => now - f.t < 500) }));

    // powerups pickup
    setEntities(s => ({ ...s, powerups: s.powerups.filter(pu => {
      let picked = false;
      for (const pl of s.players) {
        if (!pl.alive) continue;
        const r = Math.floor((pl.y + 15)/TILE), c = Math.floor((pl.x + 15)/TILE);
        if (Math.floor(pu.y/TILE) === r && Math.floor(pu.x/TILE) === c) {
          if (pu.kind === 'bombs') pl.bombsMax += 1;
          if (pu.kind === 'flames') pl.bombRange += 1;
          if (pu.kind === 'speed') pl.speed += 0.3;
          picked = true;
        }
      }
      return !picked;
    }) }));

    // check end
    const alive = entities().players.filter(p => p.alive);
    if (alive.length <= 1) setRunning(false);
  }

  // RAF loop @ 60fps
  let last = performance.now();
  function loop() {
    const now = performance.now();
    const dt = now - last; last = now;
    update(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // View
  const boardStyle = { width: `${COLS*TILE}px`, height: `${ROWS*TILE}px` };

  function renderMap() {
    const rows = [];
    for (let r=0; r<ROWS; r++) {
      const cols = [];
      for (let c=0; c<COLS; c++) {
        const val = grid[r][c];
        const cls = val === 1 ? 'wall' : (val === 2 ? 'block' : 'floor');
        cols.push(h('div', { class: `tile ${cls}` }));
      }
      rows.push(h('div', { class: 'row' }, cols));
    }
    return h('div', { class: 'board', style: boardStyle },
      rows,
      // flames
      ...entities().flames.map(f => h('div', { class: 'flame', style: { left: `${f.x}px`, top: `${f.y}px` } })),
      // bombs
      ...entities().bombs.map(b => h('div', { class: 'bomb', style: { left: `${b.x+2}px`, top: `${b.y+2}px` } })),
      // powerups
      ...entities().powerups.map(pu => h('div', { class: 'flame', style: { left: `${pu.x}px`, top: `${pu.y}px`, background: pu.kind==='speed'? 'radial-gradient(circle, #8ef, #37c)' : pu.kind==='flames'? 'radial-gradient(circle, #fd8, #f70)' : 'radial-gradient(circle, #afa, #2a2)' } })),
      // players
      ...entities().players.map(p => p.alive ? h('div', { class: `player player-${p.colorIndex}`, style: { left: `${p.x}px`, top: `${p.y}px` } }) : null)
    );
  }

  function renderHud() {
    const fpsVal = fps.get() || '…';
    const lives = entities().players.map((p,i) => h('div', {}, `${p.name}: `, h('span', {}, '❤'.repeat(Math.max(0,p.lives)))));
    return h('div', { class: 'hud' },
      h('div', { class: 'lives' }, ...lives),
      h('div', {}, `FPS: ${fpsVal}`),
      !running() ? h('div', {}, 'Game Over') : null
    );
  }

  return h('div', { class: 'ui-panel' },
    renderHud(),
    renderMap()
  );
}
