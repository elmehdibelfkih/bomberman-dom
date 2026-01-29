import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { Logger } from '../utils/Logger.js';
import { fileURLToPath } from 'url';
import { GAME_CONFIG } from '../../shared/game-config.js';
import { BLOCK } from '../../shared/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getMultiplayerMap() {
    const mapPath = join(__dirname, '../maps/level5.json');
    const mapData = readFileSync(mapPath, 'utf-8');
    const mapJson = JSON.parse(mapData);

    const toAvoid = [];
    GAME_CONFIG.SPAWN_POSITIONS.forEach(position => {
        toAvoid.push({
            x: position.x,
            y: position.y
        });
    });

    // Randomize blocks on floor tiles
    for (let y = 0; y < mapJson.initial_grid.length; y++) {
        for (let x = 0; x < mapJson.initial_grid[0].length; x++) {
            if (mapJson.initial_grid[y][x] === 0 && Math.random() > 0.6
                && !toAvoid.find(p => p.x === x && p.y === y)) {
                mapJson.initial_grid[y][x] = BLOCK;
            }
        }
    }

    Logger.info('Loaded map: level5.json with randomized blocks');
    return { mapId: 5, mapData: mapJson };
}
