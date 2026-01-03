import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { send500Http } from '../helpers.js';
import { Logger } from '../utils/Logger.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MULTIPLAYER_MAPS = [1, 2, 3, 4, 5,6,7,8,9,10]; // Available maps for multiplayer

export function getMultiplayerMap() {
    const randomIndex = Math.floor(Math.random() * 10);
    const randomMapId = MULTIPLAYER_MAPS[randomIndex];
    const mapFileName = `level${randomMapId}.json`;
    const mapPath = join(__dirname, '../../frontend/game/assets/maps', mapFileName);

    const mapData = readFileSync(mapPath, 'utf-8');
    const mapJson = JSON.parse(mapData);

    Logger.info(`Loaded multiplayer map: ${mapFileName} (ID: ${randomMapId})`);
    return { mapId: randomMapId, mapData: mapJson };
}

export function mapHandler(req, res) {
    try {
        const result = getMultiplayerMap();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
    } catch (error) {
        Logger.error('Error serving multiplayer map:', error);
        send500Http(res, 'mapHandler');
    }
}
