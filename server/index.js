import http from 'http'
import { Logger } from './utils/Logger.js'
import { homeHandler } from './handlers/homeHandler.js'
import { lobbyHandler } from './handlers/lobbyHandler.js'
import { MessageHandler } from './network/MessageHandler.js'
import { RoomManager } from './core/RoomManager.js'
import { IdGenerator } from './utils/IdGenerator.js'
import { Connection } from './network/Connection.js'
import { WebSocketServer } from 'ws'

const PORT = 9090

const httpServer = http.createServer((req, res) => {
    switch (req.url) {
        case '/':
            homeHandler(req, res)
            break;

        case '/game-lobby':
            lobbyHandler(req, res)
            break;

        default:
            res.statusCode = 404
            res.end('not-found')
            break;
    }
}).listen(PORT, `127.0.0.1`, () => {
    Logger.info(`server running on: http://127.0.0.1:${PORT}`)
})

const wss = new WebSocketServer({ server: httpServer })

const messageHandler = new MessageHandler();
const roomManager = new RoomManager();
const connections = new Set();

wss.on('connection', (ws, req) => {
    const clientId = IdGenerator.generatePlayerId()
    const conn = new Connection(ws, clientId)
    connections.add(conn)

    ws.on('message', (data) => {
        const message = JSON.parse(data)
        messageHandler.handle(conn, message)
    })

    ws.on('close', () => {
        Logger.info(`Client disconnected: ${clientId}`)
        connections.delete(conn)
        roomManager.handleDisconnect(conn.clientId)
    })

    ws.on('error', (error) => {
        Logger.error(`WebSocket error for ${clientId}:`, error)
    })
})
