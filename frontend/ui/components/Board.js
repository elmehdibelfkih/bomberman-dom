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

            const tile = dom({ tag: 'div', attributes: { class: `cell cell-${val}`, style: `position:absolute; left:${x*scaledCell}px; top:${y*scaledCell}px; width:${scaledCell}px; height:${scaledCell}px; background:${color}; border:${border}; box-sizing:border-box;` } });
            boardEl.appendChild(tile);
        }
    }

    const playersContainer = dom({ tag: 'div', attributes: { class: 'players-container', style: 'position:absolute; left:0; top:0; width:100%; height:100%; pointer-events:none;' } });
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

    // initial players
    updatePlayers(players);

    return { element: boardEl, updatePlayers };
};

