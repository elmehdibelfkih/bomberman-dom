export class GameRoom {
    constructor(roomId, playerIds, mapId) {
        this.roomId = this.roomId
        this.mapId = mapId
        this.playerConnections = new Map()
        this.status = 'INITIALIZING'
    }

    addPlayerConnection(playerId, connection) {
        this.playerConnections.set(playerId, connection)
    }

    broadcast(message, excludedPlyerId = null) {
        for (const connection of this.playerConnections) {
            if (connection.isConnected()) {
                connection.send(message)
            }
        }
    }
}