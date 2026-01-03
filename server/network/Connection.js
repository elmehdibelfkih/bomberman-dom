import { WebSocket } from "ws"

export class Connection {
    constructor(ws, playerId) {
        this.ws = ws
        this.playerId = playerId
        this.nickname = null
        this.connected = true
    }

    send(message) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message))
        }
    }

    sendError(code, message) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            const errorMessage = {
                type: 'ERROR',
                code,
                message
            }
            this.ws.send(JSON.stringify(errorMessage))
        }
    }

    setPlayerInfo(playerId, nickname) {
        this.playerId = playerId
        this.nickname = nickname
    }

    close() {
        this.connected = false
        this.ws.close()
    }

    isConnected() {
        return this.ws.readyState !== WebSocket.CLOSED
    }

}