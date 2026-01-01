import { ServerMessages } from "../../shared/message-types.js"

export class MessageBuilder {
    static connected(clientId) {
        return {
            type: ServerMessages.CONNECTED,
            clientId: clientId,
            timestamp: Date.now()
        }
    }

    static error(errorCode, message) {
        return {
            type: ServerMessages.ERROR,
            errorCode: errorCode,
            message: message,
            timestamp: Date.now()
        }
    }

    static lobbyJoined(data) {
        return {
            type: ServerMessages.LOBBY_JOINED,
            playerId: data.playerId,
            nickname: data.nickname,
            lobbyId: data.lobbyId,
            playerCount: data.playerCount,
            maxPlayers: data.maxPlayers,
            timestamp: Date.now()
        }
    }

    static playerJoined(playerId, nickname, playerCount) {
        return {
            type: ServerMessages.PLAYER_JOINED,
            playerId: playerId,
            nickname: nickname,
            playerCount: playerCount,
            timestamp: Date.now()
        }
    }

    static playerLeft(playerId) {
        return {
            type: ServerMessages.PLAYER_LEFT,
            playerId: playerId,
            timestamp: Date.now()
        }
    }

    static countdownStart(duration) {
        return {
            type: ServerMessages.COUNTDOWN_START,
            duration: duration,
            timestamp: Date.now()
        }
    }

    static countdownTick(remaining) {
        return {
            type: ServerMessages.COUNTDOWN_TICK,
            remaining: remaining,
            timestamp: Date.now()
        }
    }

    static gameStarted(gameData) {
        return {
            type: ServerMessages.GAME_STARTED,
            roomId: gameData.roomId,
            mapId: gameData.mapId,
            players: gameData.players,
            timestamp: Date.now()
        }
    }

    static gameState(state) {
        return {
            type: ServerMessages.FULL_STATE,
            gameState: state,
            timestamp: Date.now()
        }
    }

    static playerMoved(playerId, position) {
        return {
            type: ServerMessages.PLAYER_MOVED,
            playerId: playerId,
            position: position,
            timestamp: Date.now()
        }
    }

    static bombPlaced(bomb) {
        return {
            type: ServerMessages.BOMB_PLACED,
            bomb: bomb,
            timestamp: Date.now()
        }
    }

    static bombExploded(bombId, explosionCells) {
        return {
            type: ServerMessages.BOMB_EXPLODED,
            bombId: bombId,
            explosionCells: explosionCells,
            timestamp: Date.now()
        }
    }

    static powerUpSpawned(powerUp) {
        return {
            type: ServerMessages.POWERUP_SPAWNED,
            powerUp: powerUp,
            timestamp: Date.now()
        }
    }

    static powerUpCollected(playerId, powerUpId, powerUpType) {
        return {
            type: ServerMessages.POWERUP_COLLECTED,
            playerId: playerId,
            powerUpId: powerUpId,
            powerUpType: powerUpType,
            timestamp: Date.now()
        }
    }

    static playerDamaged(playerId, lives, isAlive) {
        return {
            type: ServerMessages.PLAYER_DAMAGED,
            playerId: playerId,
            lives: lives,
            isAlive: isAlive,
            timestamp: Date.now()
        }
    }

    static playerDied(playerId) {
        return {
            type: ServerMessages.PLAYER_DIED,
            playerId: playerId,
            timestamp: Date.now()
        }
    }

    static playerDisconnected(playerId) {
        return {
            type: ServerMessages.PLAYER_DISCONNECTED,
            playerId: playerId,
            timestamp: Date.now()
        }
    }

    static chatMessage(data) {
        return {
            type: ServerMessages.CHAT_MESSAGE,
            playerId: data.playerId,
            nickname: data.nickname,
            message: data.message,
            timestamp: data.timestamp
        }
    }

    static gameOver(data) {
        return {
            type: ServerMessages.GAME_OVER,
            winnerId: data.winnerId,
            finalScores: data.finalScores,
            timestamp: Date.now()
        }
    }

    static gameLeft() {
        return {
            type: 'GAME_LEFT',
            timestamp: Date.now()
        }
    }
}