import { readFileSync } from 'fs';
import { join, extname, normalize, resolve } from 'path';
import { MIME_TYPES } from './utils.js';
import { Logger } from '../utils/Logger.js';

const FRONTEND_DIR = resolve('./frontend');

export function staticHandler(req, res) {
    try {
        let fileUrl = req.url.split('?')[0];

        fileUrl = fileUrl.replace(/^\/+/, '');

        const fullPath = join(FRONTEND_DIR, fileUrl);
        const normalPath = normalize(fullPath);

        if (!normalPath.startsWith(FRONTEND_DIR)) {
            res.writeHead(403);
            return res.end('Access denied');
        }

        const content = readFileSync(normalPath);
        const ext = extname(fileUrl).toLowerCase();

        // Send response
        res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'text/plain'
        });
        res.end(content);

        Logger.info(`Served static file: ${fileUrl}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            Logger.warn(`Static file not found: ${req.url}`);
            res.writeHead(404);
            res.end('File not found');
        } else {
            Logger.error(`Error serving static file ${req.url}:`, error);
            res.writeHead(500);
            res.end('Internal server error');
        }
    }
}

