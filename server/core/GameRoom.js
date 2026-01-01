import { GameEngine } from "./GameEngine.js"
import { MessageBuilder } from "../network/MessageBuilder.js"
import { Logger } from "../utils/Logger.js"
import { GAME_CONFIG } from "../../shared/game-config.js"

export class GameRoom {
    constructor(roomId, playerIds, mapId) {
        this.roomId = roomId
        this.mapId = mapId
        this.playerConnections = new Map()
        this.status = 'INITIALIZING'
        this.gameEngine = new GameEngine(this)
        this.players = new Map()
        this.gameStartTime = null
        this.gameLoop = null
        
        // Initialize players
        playerIds.forEach((playerId, index) => {
            this.players.set(playerId, {
                id: playerId,
                position: this.getStartingPosition(index),
                lives: GAME_CONFIG.STARTING_LIVES,
                score: 0,
                powerUps: [],
                isAlive: true
            })
        })
    }

    addPlayerConnection(playerId, connection) {
        this.playerConnections.set(playerId, connection)
        connection.setRoomId(this.roomId)
    }

    getStartingPosition(playerIndex) {
        const positions = [
            { x: 1, y: 1 },     // Top-left
            { x: 13, y: 1 },    // Top-right
            { x: 1, y: 11 },    // Bottom-left
            { x: 13, y: 11 }    // Bottom-right
        ]
        return positions[playerIndex] || positions[0]
    }

    startGame() {
        this.status = 'PLAYING'
        this.gameStartTime = Date.now()
        
        Logger.info(`Game started in room ${this.roomId}`)
        
        // Send game start message to all players
        this.broadcast(MessageBuilder.gameStarted({
            roomId: this.roomId,
            mapId: this.mapId,
            players: Array.from(this.players.values())
        }))
        
        // Initialize game engine
        this.gameEngine.initialize()
        
        // Start game loop
        this.startGameLoop()
    }

    startGameLoop() {
        const TICK_RATE = 1000 / 60 // 60 FPS
        
        this.gameLoop = setInterval(() => {
            if (this.status === 'PLAYING') {
                this.gameEngine.update()
                this.sendGameState()
            }
        }, TICK_RATE)
    }

    handlePlayerInput(playerId, input) {
        if (this.status !== 'PLAYING') return
        
        const player = this.players.get(playerId)
        if (!player || !player.isAlive) return
        
        this.gameEngine.processPlayerInput(playerId, input)
    }

    sendGameState() {
        const gameState = {
            timestamp: Date.now(),
            players: Array.from(this.players.values()),
            bombs: this.gameEngine.getBombs(),
            powerUps: this.gameEngine.getPowerUps(),
            blocks: this.gameEngine.getBlocks()
        }
        
        this.broadcast(MessageBuilder.gameState(gameState))
    }

    handlePlayerDisconnect(playerId) {
        Logger.info(`Player ${playerId} disconnected from room ${this.roomId}`)
        
        const player = this.players.get(playerId)
        if (player) {
            player.isAlive = false
        }
        
        this.playerConnections.delete(playerId)
        
        // Check if game should end
        const alivePlayers = Array.from(this.players.values()).filter(p => p.isAlive)
        if (alivePlayers.length <= 1) {
            this.endGame(alivePlayers[0]?.id)
        }
        
        // Broadcast player disconnect
        this.broadcast(MessageBuilder.playerDisconnected(playerId))
    }

    endGame(winnerId = null) {
        this.status = 'FINISHED'
        
        if (this.gameLoop) {
            clearInterval(this.gameLoop)
            this.gameLoop = null
        }
        
        Logger.info(`Game ended in room ${this.roomId}, winner: ${winnerId || 'none'}`)
        
        this.broadcast(MessageBuilder.gameOver({
            winnerId,
            finalScores: Array.from(this.players.values()).map(p => ({
                playerId: p.id,
                score: p.score,
                lives: p.lives
            }))
        }))
        
        // Clean up after 30 seconds
        setTimeout(() => {
            this.cleanup()
        }, 30000)
    }

    cleanup() {
        if (this.gameLoop) {
            clearInterval(this.gameLoop)
        }
        this.playerConnections.clear()
        this.players.clear()
        Logger.info(`Room ${this.roomId} cleaned up`)
    }

    broadcast(message, excludedPlayerId = null) {
        this.playerConnections.forEach((connection, playerId) => {
            if (playerId !== excludedPlayerId && connection.isConnected()) {
                connection.send(message)
            }
        })
    }

    getPlayerCount() {
        return this.playerConnections.size
    }

    isActive() {
        return this.status === 'PLAYING'
    }
}