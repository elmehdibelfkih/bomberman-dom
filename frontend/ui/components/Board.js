import { dom } from '../../../framework/index.js';
import { CLIENT_CONFIG } from '../../config/client-config.js';

// Stable minimal Board implementation with same external API.
export const Board = ({ mapData = { initial_grid: [[]] }, players = [], yourPlayerId } = {}) => {
    const cellSize = (CLIENT_CONFIG && CLIENT_CONFIG.CELL_SIZE) || 32;
    const grid = (mapData && mapData.initial_grid) || [[]];

    const boardEl = dom({ tag: 'div', attributes: { class: 'board', style: `position: relative; width: ${grid[0].length * cellSize}px; height: ${grid.length * cellSize}px; background: #071;` } });

    // inject simple CSS animation for bombs (keeps this component self-contained)
    const styleId = 'board-bomb-styles';
    if (!document.getElementById(styleId)) {
        const styleEl = document.createElement('style');
        styleEl.id = styleId;
        styleEl.innerHTML = ``; // Animations now in main CSS
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
            const tile = dom({ tag: 'div', attributes: { id, class: `cell cell-${val}`, style: `position:absolute; left:${x*cellSize}px; top:${y*cellSize}px; width:${cellSize}px; height:${cellSize}px; background:${color}; border:${border}; box-sizing:border-box;` } });
            tilesContainer.appendChild(tile);
        }
    }

    const bombsContainer = dom({ tag: 'div', attributes: { class: 'bombs-container', style: 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; z-index:5;' } });
    boardEl.appendChild(bombsContainer);

    const playersContainer = dom({ tag: 'div', attributes: { class: 'players-container', style: 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; z-index:10;' } });
    boardEl.appendChild(playersContainer);

    const powerupsContainer = dom({ tag: 'div', attributes: { class: 'powerups-container', style: 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none; z-index:6;' } });
    boardEl.appendChild(powerupsContainer);

    function updatePlayers(newPlayers = []) {
        // Use consistent player size (70% of block size to match server collision)
        const playerSize = Math.round(cellSize * 0.7);
        const offset = Math.round((cellSize - playerSize) / 2);

        newPlayers.forEach(p => {
            const id = `player-${p.playerId}`;
            let el = playersContainer.querySelector(`#${id}`);
            if (!el) {
                el = dom({ 
                    tag: 'div', 
                    attributes: { 
                        id, 
                        class: p.playerId === yourPlayerId ? 'player local-player' : 'player remote-player', 
                        style: `position:absolute; width:${playerSize}px; height:${playerSize}px; border-radius:50%; background:${p.playerId === yourPlayerId ? '#0c6' : '#36f'}; z-index:10;` 
                    } 
                });
                playersContainer.appendChild(el);
            }

            // Use server's pixel coordinates directly for smooth movement
            const px = (typeof p.x === 'number' ? Math.round(p.x) : ((p.gridX || 0) * cellSize));
            const py = (typeof p.y === 'number' ? Math.round(p.y) : ((p.gridY || 0) * cellSize));
            const left = px + offset;
            const top = py + offset;
            
            el.style.left = `${left}px`;
            el.style.top = `${top}px`;
        });
    }

    function updateBombs(bombs = []) {
        // bombs: array of { bombId, playerId, gridX, gridY, range, timer }
        bombsContainer.innerHTML = '';
        bombs.forEach(b => {
            const id = `bomb-${b.bombId}`;
            const size = Math.round(cellSize * 0.5);
            const leftPx = b.gridX * cellSize + Math.round((cellSize - size) / 2);
            const topPx = b.gridY * cellSize + Math.round((cellSize - size) / 2);

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
            const size = cellSize;
            const leftPx = e.gridX * cellSize;
            const topPx = e.gridY * cellSize;

            const el = dom({ tag: 'div', attributes: { class: 'explosion', style: `position:absolute; left:${leftPx}px; top:${topPx}px; width:${size}px; height:${size}px; pointer-events:none; z-index:20; display:flex; align-items:center; justify-content:center;` } });
            const inner = dom({ tag: 'div', attributes: { style: `width:70%; height:70%; border-radius:50%; background: radial-gradient(circle at 30% 30%, #fff 0%, rgba(255,200,0,0.95) 30%, rgba(255,100,0,0.9) 60%, rgba(255,0,0,0.6) 100%); animation: explosion-fade ${duration}ms ease-out forwards;` } });
            el.appendChild(inner);
            boardEl.appendChild(el);

            setTimeout(() => {
                if (el && el.parentNode) el.parentNode.removeChild(el);
            }, duration + 50);
        });
    }

    function updatePowerups(powerups = []) {
        powerupsContainer.innerHTML = '';
        powerups.forEach(p => {
            const size = Math.round(cellSize * 0.45);
            const leftPx = p.gridX * cellSize + Math.round((cellSize - size) / 2);
            const topPx = p.gridY * cellSize + Math.round((cellSize - size) / 2);

            let color = '#ff0';
            let label = '';
            
            // Handle both string and numeric power-up types
            const powerupType = p.type || p.powerupType;
            
            switch (powerupType) {
                case 'BOMB_COUNT':
                case 8: // POWERUP_BOMB
                    color = '#ff9800'; 
                    label = '💣'; 
                    break;
                case 'SPEED':
                case 10: // POWERUP_SPEED
                    color = '#4caf50'; 
                    label = '⚡'; 
                    break;
                case 'BOMB_RANGE':
                case 9: // POWERUP_FLAME
                    color = '#f44336'; 
                    label = '🔥'; 
                    break;
                default: 
                    console.log('Unknown power-up type:', powerupType);
                    return; // Skip unknown power-ups
            }

            const el = dom({ tag: 'div', attributes: { class: 'powerup', style: `position:absolute; left:${leftPx}px; top:${topPx}px; width:${size}px; height:${size}px; border-radius:6px; background:${color}; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; z-index:6; font-size:${Math.round(size * 0.6)}px;` }, children: [label] });
            powerupsContainer.appendChild(el);
        });
    }

    // initial players
    updatePlayers(players);

    return { element: boardEl, updatePlayers, updateBombs, updateBlocks, playExplosions, updatePowerups };
};

