import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { send500Http } from '../helpers.js';
import { Logger } from '../utils/Logger.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getMultiplayerMap() {
    const randomIndex = Math.floor(Math.random() * 10)+1;
    const mapFileName = `level${randomIndex}.json`;
    const mapPath = join(__dirname, '../../frontend/game/assets/maps', mapFileName);

    console.log(mapPath)

    const mapData = readFileSync(mapPath, 'utf-8');
    const mapJson = JSON.parse(mapData);

    Logger.info(`Loaded multiplayer map: ${mapFileName} (ID: ${randomIndex})`);
    return { mapId: randomIndex, mapData: mapJson };
}
