import { Logger } from '../utils/Logger.js';
import { MessageBuilder } from '../network/MessageBuilder.js';

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

        console.log(this.mapData)

        this.broadcast(MessageBuilder.gameStarted(this.roomId, this.mapId, this.mapData, this.players));

        const fullState = this.engine.serializeFullState();
        this.broadcast(MessageBuilder.fullState(
            fullState.grid,
            fullState.players,
            fullState.bombs,
            fullState.powerups
        ));

        Logger.info(`Game ${this.roomId} started successfully`);
    }

    broadcast(message, excludePlayerId = null) {
        let sentCount = 0;

        for (const [playerId, connection] of this.playerConnections.entries()) {
            // Skip excluded player
            if (playerId === excludePlayerId) {
                continue;
            }

            // Check connection is alive
            if (!connection.isConnected()) {
                Logger.warn(`Connection for player ${playerId} is dead, skipping broadcast`);
                continue;
            }

            // Send message
            connection.send(message);
            sentCount++;
        }

        Logger.debug(`Broadcast ${message.type} to ${sentCount} players in room ${this.roomId}`);
    }

    handlePlayerDisconnect(playerId) {
        Logger.info(`Player ${playerId} disconnected from room ${this.roomId}`);

        // Remove connection
        this.playerConnections.delete(playerId);

        // Remove from engine
        if (this.engine) {
            this.engine.removePlayer(playerId);
        }

        // Broadcast to remaining players
        this.broadcast(MessageBuilder.playerDisconnected(playerId));

        // Check if enough players remain
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

        // Gather scores
        const scores = {};
        if (this.engine) {
            this.engine.entities.players.forEach((player, playerId) => {
                scores[playerId] = {
                    nickname: player.nickname,
                    score: player.score,
                    kills: player.kills || 0,
                    deaths: player.deaths || 0
                };
            });
        }

        // Broadcast game over
        this.broadcast(MessageBuilder.gameOver(winner, scores, duration));

        Logger.info(`Game ${this.roomId} finished: duration=${duration}ms, reason=${reason}`);
    }

    isEmpty() {
        return this.playerConnections.size === 0;
    }
}
