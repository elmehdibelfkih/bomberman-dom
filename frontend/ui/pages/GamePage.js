import { dom } from '../../../framework/index.js';
import { CLIENT_CONFIG } from '../../config/client-config.js';

export const GamePage = ({ mapData, players, yourPlayerId }) => {
    const cellSize = CLIENT_CONFIG.CELL_SIZE;
    const grid = mapData.initial_grid;

    const gameContainer = dom({
        tag: 'div',
        attributes: {
            id: 'game-container',
            style: `position: relative; width: ${CLIENT_CONFIG.CANVAS_WIDTH}px; height: ${CLIENT_CONFIG.CANVAS_HEIGHT}px; background: #000;`
        }
    });

    // Render map
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const cell = createCell(x, y, grid[y][x], cellSize);
            gameContainer.appendChild(cell);
        }
    }

    // Render players
    players.forEach(player => {
        const playerEl = createPlayer(player, cellSize, player.playerId === yourPlayerId);
        gameContainer.appendChild(playerEl);
    });

    const page = dom({
        tag: 'div',
        attributes: { class: 'game-page' }
    });

    page.appendChild(gameContainer);
    return page;
};

function createCell(x, y, type, cellSize) {
    let color;
    switch (type) {
        case 0: color = '#90EE90'; break; // Floor
        case 1: color = '#4A4A4A'; break; // Wall
        case 2: color = '#8B4513'; break; // Block
        default: color = '#000';
    }

    return dom({
        tag: 'div',
        attributes: {
            class: `cell cell-${type}`,
            style: `position: absolute; left: ${x * cellSize}px; top: ${y * cellSize}px; width: ${cellSize}px; height: ${cellSize}px; background: ${color}; border: 1px solid #00000020;`
        }
    });
}

function createPlayer(player, cellSize, isLocal) {
    return dom({
        tag: 'div',
        attributes: {
            id: `player-${player.playerId}`,
            class: isLocal ? 'player local-player' : 'player remote-player',
            style: `position: absolute; left: ${player.x}px; top: ${player.y}px; width: ${cellSize}px; height: ${cellSize}px; background: ${isLocal ? '#00FF00' : '#FF0000'}; border-radius: 50%; z-index: 10;`
        },
        children: [
            dom({
                tag: 'div',
                attributes: {
                    style: 'position: absolute; top: -20px; left: 50%; transform: translateX(-50%); color: white; font-size: 12px; white-space: nowrap;'
                },
                children: [player.nickname]
            })
        ]
    });
}
