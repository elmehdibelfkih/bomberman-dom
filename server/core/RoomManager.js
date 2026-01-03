import { IdGenerator } from "../utils/IdGenerator.js"
import { GAME_CONFIG } from "../../shared/game-config.js"
import { MessageBuilder } from "../network/MessageBuilder.js"
import { readFileSync } from 'fs'
import { join } from 'path'
import { Logger } from '../utils/Logger.js'

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
        this.lobbies = new Map() // mapId -> lobby // lobby is an object
    }

    getRoomForPlayer(playerId) {
        const roomId = this.playerToRoom.get(playerId)
        return this.activeGames.get(roomId)
    }

    createLobby() {
        return {
            id: IdGenerator.generateLobbyId(),
            mapId,
            players: new Map(),
            status: 'WAITING',
            createdAt: Date.now(),
            waitTimer: null, //20sec
            countdownTimer: null, // 10sec
        }
    }

    joinLobby(connection, nickname, mapId) {
        const playerId = IdGenerator.generatePlayerId();
        const lobby = this.lobbies.get(mapId)
        if (!lobby) {
            lobby = this.createLobby()
            this.lobbies.set(mapId, lobby)
        }

        if (lobby.players.size > 4 || lobby.status === 'COUNTDOWN') {
            const emptyLobby = this.createLobby()
            emptyLobby.mapId = mapId
            emptyLobby.players.set(playerId, { nickname, connection })
            this.lobbies.set(mapId, emptyLobby)
            lobby = emptyLobby
        }

        lobby.players.set(playerId, { nickname, connection })

        if (lobby.players.size === 2 && !lobby.waitTimer) {
            this.startWaitTimer(lobby,);
        }
        return { playerId, lobby }
    }

    startWaitTimer(lobby, mapId) {
        lobby.waitTimer = setTimeout(() => {
            if (lobby.players.size() >= 2) {
                this.startCountDown()
            }
        }, GAME_CONFIG.WAIT_TIMER);
    }

    startCountDown(lobby, mapId) {
        clearTimeout(lobby.waitTimer)
        lobby.status = 'COUNTDOWN'
        let remaining = GAME_CONFIG.COUNTDOWN_TIMER

        this.broadcastToLobby(lobby, MessageBuilder.countdownStart(GAME_CONFIG.COUNTDOWN_TIMER))

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

    loadRandomMap() {
        const TOTAL_MAPS = 10;
        const randomMapId = Math.floor(Math.random() * TOTAL_MAPS) + 1;
        const mapFileName = `level${randomMapId}.json`;
        const mapPath = join('./frontend/game/assets/maps', mapFileName);

        try {
            const mapData = readFileSync(mapPath, 'utf-8');
            const mapJson = JSON.parse(mapData);
            Logger.info(`Loaded random map: ${mapFileName} (ID: ${randomMapId})`);
            return { mapId: randomMapId, mapData: mapJson };
        } catch (error) {
            Logger.error(`Error loading map ${mapFileName}:`, error);
            throw new Error('Failed to load map');
        }
    }

    startGame(lobbyId, mapId) {
        const lobby = this.lobbies.get(mapId);
        if (!lobby) {
            Logger.error(`Lobby not found for mapId: ${mapId}`);
            return;
        }

        // Load a random map
        const { mapId: selectedMapId, mapData } = this.loadRandomMap();

        // Create room ID
        const roomId = IdGenerator.generateRoomId();

        // Prepare players array
        const players = [];
        lobby.players.forEach((playerData, playerId) => {
            players.push({
                playerId,
                nickname: playerData.nickname,
            });
            this.playerToRoom.set(playerId, roomId);
        });

        // Broadcast game start to all players with map data
        this.broadcastToLobby(
            lobby,
            MessageBuilder.gameStarted(roomId, selectedMapId, mapData, players)
        );

        // Clean up lobby
        this.lobbies.delete(mapId);

        Logger.info(`Game started: roomId=${roomId}, mapId=${selectedMapId}, players=${players.length}`);
    }
}