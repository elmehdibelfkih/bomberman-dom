import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { Logger } from '../utils/Logger.js';
import { fileURLToPath } from 'url';
import { GAME_CONFIG } from '../../shared/game-config.js';
import { BLOCK } from '../../shared/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getMultiplayerMap() {
    const randomIndex = Math.floor(Math.random() * 10) + 1;
    const mapFileName = `level${1}.json`;
    const mapPath = join(__dirname, '../maps', mapFileName);

    const mapData = readFileSync(mapPath, 'utf-8');
    const mapJson = JSON.parse(mapData);

    const toAvoid = []
    GAME_CONFIG.SPAWN_POSITIONS.forEach(position => {
        toAvoid.push({
            x: position.x == 1 ? position.x + 1 : position.x,
            y: position.y == 1 ? position.y + 1 : position.y
        })
    })

    // for (let i = 0; i < mapJson.initial_grid.length; i++) {
    //     for (let j = 0; j < mapJson.initial_grid[0].length; j++) {
    //         if (mapJson.initial_grid[i][j] == 0 && Math.random() > 0.7
    //             && !toAvoid.find(p => p.x == i && p.y == j)) {
    //             mapJson.initial_grid[i][j] = BLOCK
    //         }
    //     }
    // }

    Logger.info(`Loaded multiplayer map: ${mapFileName} (ID: ${randomIndex})`);
    return { mapId: randomIndex, mapData: mapJson };
}
