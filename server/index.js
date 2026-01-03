import http from 'http'
import { readFileSync } from 'fs'
import { join, extname, normalize, resolve, dirname } from 'path'
import { Logger } from './utils/Logger.js'
import { MIME_TYPES } from './handlers/utils.js'
import { MessageHandler } from './network/MessageHandler.js'
import { RoomManager } from './core/RoomManager.js'
import { IdGenerator } from './utils/IdGenerator.js'
import { Connection } from './network/Connection.js'
import { WebSocketServer } from 'ws'
import { fileURLToPath } from 'url'

const PORT = 9090
const STATIC_PATH = '../frontend'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const frontendPath = resolve(__dirname, STATIC_PATH);

export function initServer(directoryPath) {
    return http.createServer((req, res) => {
        try {
            let fileUrl = req.url === '/' ? 'index.html' : req.url;
            fileUrl = fileUrl.split('?')[0];
            fileUrl = fileUrl.replace(/^\/+/, '');

            const fullPath = join(directoryPath, fileUrl);
            const normalPath = normalize(fullPath);

            if (!normalPath.startsWith(resolve(directoryPath))) {
                res.writeHead(403);
                return res.end('Access denied');
            }

            let content;
            let ext = extname(fileUrl).toLowerCase();

            try {
                content = readFileSync(fullPath);
            } catch (error) {
                // If file not found and no extension, serve index.html (SPA routing)
                if (!ext) {
                    const indexPath = join(directoryPath, 'index.html');
                    content = readFileSync(indexPath);
                    ext = '.html';
                } else {
                    throw error;
                }
            }

            res.writeHead(200, {
                'Content-Type': MIME_TYPES[ext] || 'text/plain'
            });
            res.end(content);

        } catch (error) {
            res.writeHead(404);
            res.end('File not found');
        }
    });
}

const httpServer = initServer(frontendPath).listen(PORT, () => {
    Logger.info(`server running on: http://localhost:${PORT}`)
})

const wss = new WebSocketServer({ server: httpServer })

const messageHandler = new MessageHandler();
const roomManager = new RoomManager();
const connections = new Set();

wss.on('connection', (ws, req) => {
    const playerId = IdGenerator.generatePlayerId()
    const conn = new Connection(ws, playerId)
    connections.add(conn)

    ws.on('message', (data) => {
        messageHandler.handle(conn, data)
    })

    ws.on('close', () => {
        Logger.info(`Client disconnected: ${playerId}`)
        connections.delete(conn)
        roomManager.handleDisconnect(conn.playerId)
    })

    ws.on('error', (error) => {
        Logger.error(`WebSocket error for ${playerId}:`, error)
    })
})
