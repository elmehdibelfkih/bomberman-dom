import { WebSocket } from "ws"

export class Connection {
    constructor(ws, clientId) {
        this.ws = ws
        this.clientId = clientId
        this.playerId = null
        this.nickname = null
        this.connected = true
    }

    send(message) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message))
        }
    }

    sendError(code, rawMessage) {
        if (this.connected && this.ws.readyState === WebSocket.OPEN){
            const message = {
                
            }
            this.ws.send(JSON.stringify(message))
        }
    }

    close() {
        this.connected = false
        this.ws.close()
    }

    isConnected() {
        return this.ws.readyState !== WebSocket.CLOSED
    }

}