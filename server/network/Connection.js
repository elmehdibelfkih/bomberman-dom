import { WebSocket } from "ws"
import { Logger } from "../utils/Logger.js"

export class Connection {
    constructor(ws, clientId) {
        this.ws = ws
        this.clientId = clientId
        this.playerId = null
        this.nickname = null
        this.roomId = null
        this.connected = true
    }

    send(message) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            try {
                this.ws.send(JSON.stringify(message))
            } catch (error) {
                Logger.error(`Failed to send message to ${this.clientId}:`, error)
                this.connected = false
            }
        }
    }

    sendError(code, rawMessage) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN){
            const message = {
                type: 'ERROR',
                errorCode: code,
                message: rawMessage,
                timestamp: Date.now()
            }
            this.ws.send(JSON.stringify(message))
        }
    }

    setPlayerInfo(playerId, nickname) {
        this.playerId = playerId
        this.nickname = nickname
    }

    setRoomId(roomId) {
        this.roomId = roomId
    }

    close() {
        this.connected = false
        this.ws.close()
    }

    isConnected() {
        return this.connected && this.ws.readyState === WebSocket.OPEN
    }
}