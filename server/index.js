import http from 'http'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { Logger } from './utils/Logger.js'
import { MessageHandler } from './network/MessageHandler.js'
import { RoomManager } from './core/RoomManagerNew.js'
import { IdGenerator } from './utils/IdGenerator.js'
import { Connection } from './network/Connection.js'
import { WebSocketServer } from 'ws'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = process.env.PORT || 8080

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg'
}

function serveStaticFile(req, res, filePath) {
    const fullPath = path.join(__dirname, '../frontend', filePath)
    const ext = path.extname(fullPath)
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    
    fs.readFile(fullPath, (err, data) => {
        if (err) {
            res.writeHead(404)
            res.end('File not found')
            return
        }
        res.writeHead(200, { 'Content-Type': contentType })
        res.end(data)
    })
}

const httpServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    
    let filePath = req.url === '/' ? '/index.html' : req.url
    serveStaticFile(req, res, filePath)
}).listen(PORT, () => {
    Logger.info(`🚀 Bomberman server running on: http://localhost:${PORT}`)
})

const wss = new WebSocketServer({ server: httpServer })

const messageHandler = new MessageHandler();
const roomManager = RoomManager.getInstance();
const connections = new Set();

wss.on('connection', (ws, req) => {
    const clientId = IdGenerator.generatePlayerId()
    const conn = new Connection(ws, clientId)
    connections.add(conn)
    
    Logger.info(`🔗 Client connected: ${clientId}`)

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data)
            messageHandler.handle(conn, message)
        } catch (error) {
            Logger.error('Invalid message format:', error)
            conn.sendError('INVALID_MESSAGE', 'Message must be valid JSON')
        }
    })

    ws.on('close', () => {
        Logger.info(`🔌 Client disconnected: ${clientId}`)
        connections.delete(conn)
        roomManager.handleDisconnect(conn.clientId)
    })

    ws.on('error', (error) => {
        Logger.error(`⚠️ WebSocket error for ${clientId}:`, error)
    })
    
    // Send welcome message
    conn.send({
        type: 'CONNECTED',
        clientId: clientId,
        timestamp: Date.now()
    })
})
