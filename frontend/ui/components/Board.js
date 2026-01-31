import { dom } from '../../../framework/index.js';
import { CLIENT_CONFIG } from '../../config/client-config.js';

// Stable minimal Board implementation with same external API.
export const Board = ({ mapData = { initial_grid: [[]] }, players = [], yourPlayerId } = {}) => {
    const cellSize = (CLIENT_CONFIG && CLIENT_CONFIG.CELL_SIZE) || 32;
    // Visual scale factor for slightly larger board
    const SCALE = 1.1; // ~10% larger
    const scaledCell = Math.round(cellSize * SCALE);
    const grid = (mapData && mapData.initial_grid) || [[]];

    const boardEl = dom({ tag: 'div', attributes: { class: 'board', style: `position: relative; width: ${grid[0].length * scaledCell}px; height: ${grid.length * scaledCell}px; background: #071;` } });

    // inject simple CSS animation for bombs (keeps this component self-contained)
    const styleId = 'board-bomb-styles';
    if (!document.getElementById(styleId)) {
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.innerHTML = `@keyframes bomb-pulse { 0% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.15); opacity: 0.85 } 100% { transform: scale(1); opacity: 1 } } .bomb { box-shadow: 0 0 8px rgba(0,0,0,0.6); }`;
        document.head.appendChild(styleEl);
    }

    // create a dedicated tiles layer so we can control stacking order
    const tilesContainer = dom({ tag: 'div', attributes: { class: 'tiles-container', style: 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; z-index:1;' } });
    boardEl.appendChild(tilesContainer);

    // render tiles with clear colors for floor, wall and block
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const val = grid[y][x];
            let color = '#223';
            let border = '1px solid rgba(0,0,0,0.08)';
            // map values follow shared/constants: 0 floor, 1 wall, 2 block
            if (val === 0) { color = '#2e7d32'; border = '1px solid rgba(0,0,0,0.05)'; }
            else if (val === 1) { color = '#263238'; border = '1px solid rgba(0,0,0,0.6)'; }
            else if (val === 2) { color = '#6d4c41'; border = '1px solid rgba(0,0,0,0.5)'; }

            const id = `tile-${x}-${y}`;
            const tile = dom({ tag: 'div', attributes: { id, class: `cell cell-${val}`, style: `position:absolute; left:${x*scaledCell}px; top:${y*scaledCell}px; width:${scaledCell}px; height:${scaledCell}px; background:${color}; border:${border}; box-sizing:border-box;` } });
            tilesContainer.appendChild(tile);
        }
    }

    const bombsContainer = dom({ tag: 'div', attributes: { class: 'bombs-container', style: 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; z-index:5;' } });
    boardEl.appendChild(bombsContainer);

    const playersContainer = dom({ tag: 'div', attributes: { class: 'players-container', style: 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; z-index:10;' } });
    boardEl.appendChild(playersContainer);

    function updatePlayers(newPlayers = []) {
        // match server-side hitbox which uses ~40% of block size; scale for visuals
        const playerSize = Math.round(scaledCell * 0.4);
        const offset = Math.round((scaledCell - playerSize) / 2);

        newPlayers.forEach(p => {
            const id = `player-${p.playerId}`;
            let el = playersContainer.querySelector(`#${id}`);
            if (!el) {
                el = dom({ tag: 'div', attributes: { id, class: p.playerId === yourPlayerId ? 'player local-player' : 'player remote-player', style: `position:absolute; width:${playerSize}px; height:${playerSize}px; border-radius:50%; background:${p.playerId === yourPlayerId ? '#0c6' : '#36f'}; z-index:10;` } });
                playersContainer.appendChild(el);
            }

            const px = (typeof p.x === 'number' ? Math.round(p.x) : ((p.gridX || 0) * cellSize));
            const py = (typeof p.y === 'number' ? Math.round(p.y) : ((p.gridY || 0) * cellSize));
            const left = Math.round(px * SCALE) + offset;
            const top = Math.round(py * SCALE) + offset;
            el.style.left = `${left}px`;
            el.style.top = `${top}px`;
        });
    }

    function updateBombs(bombs = []) {
        // bombs: array of { bombId, playerId, gridX, gridY, range, timer }
        bombsContainer.innerHTML = '';
        bombs.forEach(b => {
            const id = `bomb-${b.bombId}`;
            const size = Math.round(scaledCell * 0.5);
            const leftPx = b.gridX * scaledCell + Math.round((scaledCell - size) / 2);
            const topPx = b.gridY * scaledCell + Math.round((scaledCell - size) / 2);

            const el = dom({ tag: 'div', attributes: { id, class: 'bomb', style: `position:absolute; left:${leftPx}px; top:${topPx}px; width:${size}px; height:${size}px; border-radius:50%; background:#222; display:flex; align-items:center; justify-content:center; animation: bomb-pulse 800ms ease-in-out infinite; overflow:hidden;` }, children: [] });

            // countdown bar: shrinks width from 100% to 0% over `timer` ms
            const timerMs = b.timer || (CLIENT_CONFIG && CLIENT_CONFIG.BOMB_TIMER) || 3000;
            const bar = dom({ tag: 'div', attributes: { class: 'bomb-timer', style: `position:absolute; left:0; bottom:0; height:6px; width:100%; background:rgba(255,100,0,0.9); transition: width ${timerMs}ms linear;` } });
            el.appendChild(bar);

            bombsContainer.appendChild(el);

            // trigger shrink after append so transition animates
            setTimeout(() => { bar.style.width = '0%'; }, 30);
        });
    }

    // Update map cells after blocks were destroyed
    function setCellValue(gridX, gridY, value) {
        const el = boardEl.querySelector(`#tile-${gridX}-${gridY}`);
        if (!el) return;

        let color = '#223';
        let border = '1px solid rgba(0,0,0,0.08)';
        if (value === 0) { color = '#2e7d32'; border = '1px solid rgba(0,0,0,0.05)'; }
        else if (value === 1) { color = '#263238'; border = '1px solid rgba(0,0,0,0.6)'; }
        else if (value === 2) { color = '#6d4c41'; border = '1px solid rgba(0,0,0,0.5)'; }

        el.style.background = color;
        el.style.border = border;
        // update class
        el.className = `cell cell-${value}`;
    }

    // Destroy blocks and then show explosion animation on explosion tiles
    function updateBlocks(destroyedBlocks = [], explosions = [], options = {}) {
        // First, remove blocks (set to floor)
        destroyedBlocks.forEach(b => {
            setCellValue(b.gridX, b.gridY, 0);
        });

        // Then play explosions on the given explosion cells
        playExplosions(explosions, options.duration || (CLIENT_CONFIG && CLIENT_CONFIG.EXPLOSION_DURATION) || 1000);
    }

    function playExplosions(explosions = [], duration = 1000) {
        explosions.forEach(e => {
            const size = scaledCell;
            const leftPx = e.gridX * scaledCell;
            const topPx = e.gridY * scaledCell;

            const el = dom({ tag: 'div', attributes: { class: 'explosion', style: `position:absolute; left:${leftPx}px; top:${topPx}px; width:${size}px; height:${size}px; pointer-events:none; z-index:20; display:flex; align-items:center; justify-content:center;` } });
            const inner = dom({ tag: 'div', attributes: { style: `width:70%; height:70%; border-radius:50%; background: radial-gradient(circle at 30% 30%, #fff 0%, rgba(255,200,0,0.95) 30%, rgba(255,100,0,0.9) 60%, rgba(255,0,0,0.6) 100%); animation: explosion-fade ${duration}ms ease-out forwards;` } });
            el.appendChild(inner);
            boardEl.appendChild(el);

            setTimeout(() => {
                if (el && el.parentNode) el.parentNode.removeChild(el);
            }, duration + 50);
        });
    }

    // initial players
    updatePlayers(players);

    return { element: boardEl, updatePlayers, updateBombs, updateBlocks, playExplosions };
};

