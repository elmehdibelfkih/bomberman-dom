import { readFileSync } from 'fs';
import { join } from 'path';
import { send500Http } from '../helpers.js';
import { Logger } from '../utils/Logger.js';

const TOTAL_MAPS = 10;

export function mapHandler(req, res) {
    try {
        const randomMapId = Math.floor(Math.random() * TOTAL_MAPS) + 1;
        const mapFileName = `level${randomMapId}.json`;
        const mapPath = join('./frontend/game/assets/maps', mapFileName);

        const mapData = readFileSync(mapPath, 'utf-8');
        const mapJson = JSON.parse(mapData);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            mapId: randomMapId,
            mapData: mapJson
        }));

        Logger.info(`Served random map: ${mapFileName} (ID: ${randomMapId})`);
    } catch (error) {
        Logger.error('Error serving random map:', error);
        send500Http(res, 'mapHandler');
    }
}
