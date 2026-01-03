import { IdGenerator } from "../utils/IdGenerator.js"
import { GAME_CONFIG } from "../../shared/game-config.js"
import { MessageBuilder } from "../network/MessageBuilder.js"
import { readFileSync } from 'fs'
import { join } from 'path'
import { Logger } from '../utils/Logger.js'
import { broadcastWs, broadcastExcludeWs } from '../helpers.js'
import { GameRoom } from './GameRoom.js'

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
        this.lobby = null
    }

    getRoomForPlayer(playerId) {
        const roomId = this.playerToRoom.get(playerId)
        return this.activeGames.get(roomId)
    }

    createLobby() {
        return {
            id: IdGenerator.generateLobbyId(),
            players: new Map(),
            status: 'WAITING',
            createdAt: Date.now(),
            waitTimer: null, //20sec
            countdownTimer: null, // 10sec
        }
    }

    joinLobby(connection, nickname) {
        const playerId = connection.playerId;

        if (!this.lobby) {
            this.lobby = this.createLobby()
        }

        if (this.lobby.players.size >= 4 || this.lobby.status === 'COUNTDOWN') {
            this.lobby = this.createLobby()
        }

        this.lobby.players.set(playerId, { nickname, connection })

        if (this.lobby.players.size === 2 && !this.lobby.waitTimer) {
            this.startWaitTimer(this.lobby);
        }

        if (this.lobby.players.size === 4) {
            this.cancelWaitTimer(this.lobby)
            this.startCountDown(this.lobby)
        }

        this.broadcastToLobby(
            this.lobby,
            MessageBuilder.playerJoined(playerId, nickname, this.lobby.players.size),
            playerId
        );

        return { playerId, lobby: this.lobby }
    }

    startWaitTimer(lobby) {
        lobby.waitTimer = setTimeout(() => {
            if (lobby.players.size >= 2) {
                this.startCountDown(lobby)
            }
        }, GAME_CONFIG.WAIT_TIMER);
    }

    startCountDown(lobby) {
        Logger.info(`Starting 10-second countdown for lobby ${lobby.id}`)
        clearTimeout(lobby.waitTimer)
        lobby.status = 'COUNTDOWN'
        let remaining = GAME_CONFIG.COUNTDOWN_TIMER / 1000 // Convert to seconds

        this.broadcastToLobby(lobby, MessageBuilder.countdownStart(remaining))

        lobby.countdownTimer = setInterval(() => {
            remaining--

            if (remaining > 0) {
                this.broadcastToLobby(lobby, MessageBuilder.countdownTick(remaining))
            } else {
                clearInterval(lobby.countdownTimer)
                Logger.info(`Countdown finished for lobby ${lobby.id}, starting game`)
                this.startGame(lobby)
            }
        }, 1000);
    }

    cancelWaitTimer(lobby) {
        clearTimeout(lobby.waitTimer)
    }

    broadcastToLobby(lobby, message, excludePlayerId = null) {
        const connections = new Map()
        lobby.players.forEach((playerData, playerId) => {
            connections.set(playerId, playerData.connection)
        })

        if (excludePlayerId) {
            broadcastExcludeWs(connections, excludePlayerId, message.type, message)
        } else {
            broadcastWs(connections, message.type, message)
        }
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

    startGame(lobby) {
        const { mapId, mapData } = this.loadRandomMap();
        const roomId = IdGenerator.generateRoomId();

        const players = [];
        lobby.players.forEach((playerData, playerId) => {
            players.push({
                playerId,
                nickname: playerData.nickname
            });
            this.playerToRoom.set(playerId, roomId);
        });

        Logger.info(`Creating game room: ${roomId}, map: ${mapId}, players: ${players.length}`);

        const gameRoom = new GameRoom(roomId, players, mapId, mapData);

        lobby.players.forEach((playerData, playerId) => {
            gameRoom.addPlayerConnection(playerId, playerData.connection);
        });

        this.activeGames.set(roomId, gameRoom);

        gameRoom.initialize()
            .then(() => {
                gameRoom.start();
            })
            .catch(error => {
                Logger.error(`Failed to start game ${roomId}:`, error);
                this.broadcastToLobby(
                    lobby,
                    MessageBuilder.error('GAME_START_FAILED', 'Failed to start game')
                );
                this.activeGames.delete(roomId);
            });

        this.lobby = null;
        Logger.info('Lobby cleared, ready for new players');
    }

    handleDisconnect(playerId) {
        Logger.info(`Handling disconnect for player ${playerId}`);

        if (this.lobby && this.lobby.players.has(playerId)) {
            this.lobby.players.delete(playerId);
            Logger.info(`Player ${playerId} removed from lobby. Remaining: ${this.lobby.players.size}`);

            this.broadcastToLobby(
                this.lobby,
                MessageBuilder.playerLeft(playerId, this.lobby.players.size)
            );

            if (this.lobby.players.size === 0) {
                if (this.lobby.waitTimer) {
                    clearTimeout(this.lobby.waitTimer);
                }
                if (this.lobby.countdownTimer) {
                    clearInterval(this.lobby.countdownTimer);
                }
                this.lobby = null;
                Logger.info('Lobby is empty, cleared');
            }
            else if (this.lobby.players.size < 2 && this.lobby.status === 'WAITING' && this.lobby.waitTimer) {
                clearTimeout(this.lobby.waitTimer);
                this.lobby.waitTimer = null;
                Logger.info('Wait timer cancelled, not enough players');
            }

            return;
        }

        const roomId = this.playerToRoom.get(playerId);
        if (roomId) {
            const gameRoom = this.activeGames.get(roomId);
            if (gameRoom) {
                gameRoom.handlePlayerDisconnect(playerId);
                this.playerToRoom.delete(playerId);

                if (gameRoom.isEmpty()) {
                    this.activeGames.delete(roomId);
                    Logger.info(`Game room ${roomId} deleted (empty)`);
                }
            }
        }
    }
}