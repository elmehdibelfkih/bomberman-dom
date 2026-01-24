import { IdGenerator } from "../utils/IdGenerator.js"
import { GAME_CONFIG } from "../../shared/game-config.js"
import { MessageBuilder } from "../network/MessageBuilder.js"
import { Logger } from '../utils/Logger.js'
import { broadcastWs, broadcastExcludeWs } from '../helpers.js'
import { GameRoom } from './GameRoom.js'
import { getMultiplayerMap } from '../handlers/mapHandler.js'

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
        const playerPosition = this.lobby.players.size;

        if (this.lobby.players.size === 2 && !this.lobby.waitTimer) {
            this.startWaitTimer(this.lobby);
        }

        if (this.lobby.players.size === 4) {
            this.cancelWaitTimer(this.lobby)
            this.startCountDown(this.lobby)
        }

        this.broadcastToLobby(
            this.lobby,
            MessageBuilder.playerJoined(playerId, nickname, this.getPlayersArray(this.lobby)),
            playerId
        );

        return { playerId, lobby: this.lobby, playerPosition }
    }

    startWaitTimer(lobby) {
        this.broadcastToLobby(lobby, {
            type: 'WAIT_TIMER_STARTED',
            message: '20-second timer started. Game will begin when 4 players join or timer expires.'
        });

        lobby.waitTimer = setTimeout(() => {
            if (lobby.players.size >= 2 && lobby.status === 'WAITING') {
                Logger.info(`Wait timer expired for lobby ${lobby.id}, starting countdown with ${lobby.players.size} players`);
                this.startCountDown(lobby);
            } else {
                Logger.info(`Wait timer expired for lobby ${lobby.id}, but only ${lobby.players.size} players - not starting game`);
            }
        }, GAME_CONFIG.WAIT_TIMER);
    }

    startCountDown(lobby) {
        if (lobby.waitTimer) {
            clearTimeout(lobby.waitTimer);
            lobby.waitTimer = null;
        }

        lobby.status = 'COUNTDOWN';
        let remaining = GAME_CONFIG.COUNTDOWN_TIMER / 1000;

        this.broadcastToLobby(lobby, MessageBuilder.countdownStart(remaining));

        lobby.countdownTimer = setInterval(() => {
            remaining--;

            if (remaining > 0) {
                this.broadcastToLobby(lobby, MessageBuilder.countdownTick(remaining));
            } else {
                clearInterval(lobby.countdownTimer);
                lobby.countdownTimer = null;
                Logger.info(`Countdown finished for lobby ${lobby.id}, starting game`);
                this.startGame(lobby);
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
        return getMultiplayerMap();
    }

    startGame(lobby) {
        try {
            Logger.info(`Starting game for lobby ${lobby.id} with ${lobby.players.size} players`);

            const { mapId, mapData } = this.loadRandomMap();
            Logger.info(`Loaded map ${mapId} for game`);

            const roomId = IdGenerator.generateRoomId();

            const players = [];
            lobby.players.forEach((playerData, playerId) => {
                players.push({
                    playerId: playerId,
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

            // Initialize and start game
            gameRoom.initialize()
                .then(() => {
                    gameRoom.start();
                    Logger.info(`Game ${roomId} started successfully`);
                })
                .catch(error => {
                    Logger.error(`Failed to initialize/start game ${roomId}:`, error);
                    Logger.error(`Error stack:`, error.stack);
                    this.broadcastToLobby(
                        lobby,
                        MessageBuilder.error('GAME_START_FAILED', 'Failed to start game')
                    );
                    this.activeGames.delete(roomId);
                });

            this.lobby = null;
            Logger.info('Lobby cleared, ready for new players');

        } catch (error) {
            Logger.error(`Error in startGame:`, error);
            Logger.error(`Error stack:`, error.stack);
            this.broadcastToLobby(
                lobby,
                MessageBuilder.error('GAME_START_FAILED', 'Failed to start game')
            );
        }
    }

    getPlayersArray(lobby) {
        const players = [];
        lobby.players.forEach((playerData, playerId) => {
            players.push({
                playerId: playerId,
                nickname: playerData.nickname
            });
        });
        return players;
    }

    handlePlayerMove(playerId, direction, sequenceNumber) {
        console.log('🎮 SERVER: Processing player move for:', playerId, 'direction:', direction);
        const roomId = this.playerToRoom.get(playerId);
        if (!roomId) {
            Logger.warn(`Player ${playerId} not in any room`);
            return;
        }

        const gameRoom = this.activeGames.get(roomId);
        if (!gameRoom) {
            Logger.warn(`Room ${roomId} not found for player ${playerId}`);
            return;
        }

        if (gameRoom.status !== 'PLAYING') {
            Logger.warn(`Move input for room ${roomId} but game status is ${gameRoom.status}`);
            return;
        }

        try {
            gameRoom.engine.processPlayerMove(playerId, direction, sequenceNumber);
        } catch (error) {
            Logger.error(`Error processing move in room ${roomId}:`, error);
        }
    }

    handlePlayerStop(playerId, message) {
        const roomId = this.playerToRoom.get(playerId)
        if (!roomId) {
            Logger.warn(`Player ${playerId} not in any room`);
            return;
        }

        const gameRoom = this.activeGames.get(roomId);
        if (!gameRoom) {
            Logger.warn(`Room ${roomId} not found for player ${playerId}`);
            return;
        }

        if (gameRoom.status !== 'PLAYING') {
            Logger.warn(`Move input for room ${roomId} but game status is ${gameRoom.status}`);
            return;
        }

        try {
            gameRoom.engine.processPlayerStop(playerId, message.sequenceNumber);
        } catch (error) {
            Logger.error(`Error processing stop_move in room ${roomId}:`, error);
        }
    }

    handlePlaceBomb(playerId) {
        const roomId = this.playerToRoom.get(playerId);
        if (!roomId) {
            Logger.warn(`Player ${playerId} not in any room`);
            return;
        }

        const gameRoom = this.activeGames.get(roomId);
        if (!gameRoom) {
            Logger.warn(`Room ${roomId} not found for player ${playerId}`);
            return;
        }

        if (gameRoom.status !== 'PLAYING') {
            Logger.warn(`Bomb input for room ${roomId} but game status is ${gameRoom.status}`);
            return;
        }

        try {
            gameRoom.engine.processPlaceBomb(playerId);
        } catch (error) {
            Logger.error(`Error placing bomb in room ${roomId}:`, error);
        }
    }

    handleDisconnect(playerId) {
        Logger.info(`Handling disconnect for player ${playerId}`);

        if (this.lobby && this.lobby.players.has(playerId)) {
            const playerData = this.lobby.players.get(playerId);
            const nickname = playerData ? playerData.nickname : 'Unknown';

            this.lobby.players.delete(playerId);
            Logger.info(`Player ${playerId} removed from lobby. Remaining: ${this.lobby.players.size}`);

            this.broadcastToLobby(
                this.lobby,
                MessageBuilder.playerLeft(playerId, nickname, this.getPlayersArray(this.lobby))
            );

            if (this.lobby.players.size === 0) {
                if (this.lobby.waitTimer) {
                    clearTimeout(this.lobby.waitTimer);
                }
                if (this.lobby.countdownTimer) {
                    clearInterval(this.lobby.countdownTimer);
                }
                this.lobby = null;
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