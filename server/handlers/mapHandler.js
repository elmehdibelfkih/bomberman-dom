import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { send500Http } from '../helpers.js';
import { Logger } from '../utils/Logger.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TOTAL_MAPS = 10;

export function getRandomMap() {
    const randomMapId = Math.floor(Math.random() * TOTAL_MAPS) + 1;
    const mapFileName = `level${randomMapId}.json`;
    const mapPath = join(__dirname, '../../frontend/game/assets/maps', mapFileName);

    const mapData = readFileSync(mapPath, 'utf-8');
    const mapJson = JSON.parse(mapData);

    Logger.info(`Loaded random map: ${mapFileName} (ID: ${randomMapId})`);
    return { mapId: randomMapId, mapData: mapJson };
}
