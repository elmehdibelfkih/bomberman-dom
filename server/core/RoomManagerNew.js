import { IdGenerator } from "../utils/IdGenerator.js"
import { GAME_CONFIG } from "../../shared/game-config.js"
import { MessageBuilder } from "../network/MessageBuilder.js"
import { GameRoom } from "./GameRoom.js"
import { Logger } from "../utils/Logger.js"

export class RoomManager {
    static #Instance = null
    static getInstance() {
        if (!RoomManager.#Instance) {
            RoomManager.#Instance = new RoomManager()
        }
        return RoomManager.#Instance
    }

    constructor() {
        if (RoomManager.#Instance) {
            throw new Error('Use RoomManager.getInstance()')
        }
        this.playerToRoom = new Map() // playerId -> roomId
        this.activeGames = new Map() // roomId -> GameRoom
        this.lobbies = new Map() // mapId -> lobby
    }

    getRoomForPlayer(playerId) {
        const roomId = this.playerToRoom.get(playerId)
        return this.activeGames.get(roomId)
    }

    createLobby(mapId) {
        return {
            id: IdGenerator.generateLobbyId(),
            mapId: mapId,
            players: new Map(),
            status: 'WAITING',
            createdAt: Date.now(),
            waitTimer: null,
            countdownTimer: null,
        }
    }

    joinLobby(connection, nickname, mapId = 1) {
        const playerId = connection.clientId;
        let lobby = this.lobbies.get(mapId)
        
        if (!lobby || lobby.players.size >= 4 || lobby.status === 'COUNTDOWN') {
            lobby = this.createLobby(mapId)
            this.lobbies.set(mapId, lobby)
        }

        lobby.players.set(playerId, { nickname, connection })
        Logger.info(`Player ${nickname} joined lobby ${lobby.id} (${lobby.players.size}/4)`)

        // Broadcast to all players in lobby
        this.broadcastToLobby(lobby, MessageBuilder.playerJoined(playerId, nickname, lobby.players.size))

        if (lobby.players.size === 2 && !lobby.waitTimer) {
            this.startWaitTimer(lobby, mapId);
        } else if (lobby.players.size === 4) {
            this.startCountDown(lobby, mapId);
        }
        
        return { playerId, lobby }
    }

    startWaitTimer(lobby, mapId) {
        Logger.info(`Starting wait timer for lobby ${lobby.id}`)
        lobby.waitTimer = setTimeout(() => {
            if (lobby.players.size >= 2) {
                this.startCountDown(lobby, mapId)
            }
        }, GAME_CONFIG.WAIT_TIMER);
    }

    startCountDown(lobby, mapId) {
        clearTimeout(lobby.waitTimer)
        lobby.status = 'COUNTDOWN'
        let remaining = GAME_CONFIG.COUNTDOWN_TIMER / 1000
        
        Logger.info(`Starting countdown for lobby ${lobby.id}`)
        this.broadcastToLobby(lobby, MessageBuilder.countdownStart(remaining))

        lobby.countdownTimer = setInterval(() => {
            remaining--

            if (remaining > 0) {
                this.broadcastToLobby(lobby, MessageBuilder.countdownTick(remaining))
            } else {
                clearInterval(lobby.countdownTimer)
                this.startGame(lobby.id, mapId)
            }
        }, 1000);
    }

    broadcastToLobby(lobby, message) {
        lobby.players.forEach((playerData, playerId) => {
            if (playerData.connection.isConnected()) {
                playerData.connection.send(message)
            }
        })
    }

    startGame(lobbyId, mapId) {
        const lobby = this.lobbies.get(mapId)
        if (!lobby) return
        
        Logger.info(`Starting game for lobby ${lobbyId} with ${lobby.players.size} players`)
        
        const roomId = IdGenerator.generateRoomId()
        const playerIds = Array.from(lobby.players.keys())
        const gameRoom = new GameRoom(roomId, playerIds, mapId)
        
        // Add player connections to game room
        lobby.players.forEach((playerData, playerId) => {
            gameRoom.addPlayerConnection(playerId, playerData.connection)
            this.playerToRoom.set(playerId, roomId)
        })
        
        this.activeGames.set(roomId, gameRoom)
        
        // Start the game
        gameRoom.startGame()
        
        // Clean up lobby
        this.lobbies.delete(mapId)
    }

    handleDisconnect(playerId) {
        // Remove from lobby
        for (const [mapId, lobby] of this.lobbies.entries()) {
            if (lobby.players.has(playerId)) {
                lobby.players.delete(playerId)
                Logger.info(`Player ${playerId} left lobby ${lobby.id}`)
                
                if (lobby.players.size === 0) {
                    clearTimeout(lobby.waitTimer)
                    clearInterval(lobby.countdownTimer)
                    this.lobbies.delete(mapId)
                } else {
                    this.broadcastToLobby(lobby, MessageBuilder.playerLeft(playerId))
                }
                break
            }
        }
        
        // Remove from active game
        const roomId = this.playerToRoom.get(playerId)
        if (roomId) {
            const gameRoom = this.activeGames.get(roomId)
            if (gameRoom) {
                gameRoom.handlePlayerDisconnect(playerId)
            }
            this.playerToRoom.delete(playerId)
        }
    }

    getAllRooms() {
        return {
            lobbies: Array.from(this.lobbies.values()),
            activeGames: Array.from(this.activeGames.values()).map(room => ({
                id: room.roomId,
                playerCount: room.playerConnections.size,
                status: room.status
            }))
        }
    }
}