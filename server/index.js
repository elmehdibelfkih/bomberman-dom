import http from 'http'
import { WebSocketServer } from 'ws'
import { Logger } from './utils/Logger.js'
import { homeHandler } from './handlers/homeHandler.js'
import { lobbyHandler } from './handlers/lobbyHandler.js'
import { roomHandler } from './handlers/roomHandler.js'
import { MessageHandler } from './network/MessageHandler.js'
import { RoomManager } from './core/RoomManager.js'
import { IdGenerator } from './utils/IdGenerator.js'
import { Connection } from './network/Connection.js'

const PORT = 9090

const httpServer = http.createServer((req, res) => {
    switch (req.url) {
        case 'game-home':
            homeHandler(req, res)
            break;
        case 'game-lobby':
            lobbyHandler(req, res)
            break;
        case 'game-room':
            roomHandler(req, res)
            break;

        default:
            break;
    }
}).listen(PORT, () => {
    Logger.info(`server running on port: ${PORT}`)
})

const wss = new WebSocketServer({ httpServer })

const messageHandler = new MessageHandler();
const roomManager = new RoomManager();
const connections = new Set();

wss.on('connection', (ws, req) => {
    const clientId = IdGenerator.generatePlayerId();
    const connection = new Connection()
    connections.add(connection)

    Logger.info(`Client connected: ${clientId}`)
})

wss.on('')