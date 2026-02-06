import { Logger } from '../utils/Logger.js';
import { MessageBuilder } from '../network/MessageBuilder.js';
import { GAME_CONFIG } from '../../config/game-config.js';
import { INITIAL_LIVES, INITIAL_SPEED } from '../../config/constants.js';

export class GameRoom {
    constructor(roomId, players, mapId, mapData) {
        this.roomId = roomId;
        this.mapId = mapId;
        this.mapData = mapData;
        this.players = players;  // Array of { playerId, nickname }

        this.playerConnections = new Map();  // playerId -> Connection
        this.engine = null;

        this.status = 'INITIALIZING';  // INITIALIZING | PLAYING | FINISHED
        this.startTime = null;
        this.endTime = null;

        // Statistics
        this.stats = {
            totalBombs: 0,
            totalExplosions: 0,
            blocksDestroyed: 0
        };
    }

    addPlayerConnection(playerId, connection) {
        this.playerConnections.set(playerId, connection);
        Logger.info(`Player ${playerId} connection added to room ${this.roomId}`);
    }

    async initialize() {
        Logger.info(`Initializing game room ${this.roomId} with map ${this.mapId}`);

        try {
            const { GameEngine } = await import('./GameEngine.js');

            this.engine = new GameEngine(this, this.mapId, this.mapData);

            await this.engine.initialize(this.players);

            this.status = 'INITIALIZED';
            Logger.info(`Game room ${this.roomId} initialized successfully`);

        } catch (error) {
            Logger.error(`Failed to initialize game room ${this.roomId}:`, error);
            throw error;
        }
    }

    start() {
        this.status = 'PLAYING';
        this.startTime = Date.now();

        Logger.info(`Game ${this.roomId} starting with ${this.players.length} players`);

        const initialPlayers = this.players.map((player, index) => {
            const spawn = GAME_CONFIG.SPAWN_POSITIONS[index];
            return {
                ...player,
                gridX: spawn.x,
                gridY: spawn.y,
                x: spawn.x * GAME_CONFIG.BLOCK_SIZE,
                y: spawn.y * GAME_CONFIG.BLOCK_SIZE,
                lives: INITIAL_LIVES,
                speed: INITIAL_SPEED,
                bombCount: 1,
                bombRange: 1,
                alive: true
            };
        });

        for (const [playerId, connection] of this.playerConnections.entries()) {
            if (connection.isConnected()) {
                connection.send(MessageBuilder.gameStarted(
                    this.roomId,
                    this.mapId,
                    this.mapData,
                    initialPlayers,
                    playerId
                ));
            }
        }

        Logger.info(`Game ${this.roomId} started - event-driven mode active`);
    }


    broadcast(message, excludePlayerId = null) {
        let sentCount = 0;

        for (const [playerId, connection] of this.playerConnections.entries()) {
            if (playerId === excludePlayerId) {
                continue;
            }
            if (!connection.isConnected()) {
                Logger.warn(`Connection for player ${playerId} is dead, skipping broadcast`);
                continue;
            }
            connection.send(message);
            sentCount++;
        }

        Logger.debug(`Broadcast ${message.type} to ${sentCount} players in room ${this.roomId}`);
    }

    handlePlayerDisconnect(playerId) {
        Logger.info(`Player ${playerId} disconnected from room ${this.roomId}`);

        this.playerConnections.delete(playerId);

        if (this.engine) {
            this.engine.removePlayer(playerId);
        }

        this.broadcast(MessageBuilder.playerDisconnected(playerId));

        if (this.playerConnections.size < 2 && this.status === 'PLAYING') {
            Logger.info(`Room ${this.roomId} ending: not enough players`);
            this.endGame('NOT_ENOUGH_PLAYERS');
        }
    }

    endGame(reason, winner = null) {
        if (this.status === 'FINISHED') {
            Logger.warn(`Game ${this.roomId} already finished`);
            return;
        }

        this.status = 'FINISHED';
        this.endTime = Date.now();
        const duration = this.endTime - this.startTime;

        Logger.info(`Game ${this.roomId} ended: ${reason}, winner: ${winner || 'none'}`);

        this.broadcast(MessageBuilder.gameOver(winner));

        Logger.info(`Game ${this.roomId} finished: duration=${duration}ms, reason=${reason}`);
    }

    isEmpty() {
        return this.playerConnections.size === 0;
    }
}
