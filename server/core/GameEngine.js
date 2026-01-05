import { Logger } from '../utils/Logger.js';
import { MessageBuilder } from '../network/MessageBuilder.js';
import { GAME_CONFIG } from '../../shared/game-config.js';
import { AuthoritativeGameState } from './AuthoritativeGameState.js';
import { INITIAL_SPEED } from '../../shared/constants.js';

export class GameEngine {
    constructor(gameRoom, mapId, mapData) {
        this.gameRoom = gameRoom;
        this.mapId = mapId;
        this.mapData = mapData;

        this.entities = {
            players: new Map(),
            bombs: new Map(),
            powerups: new Map(),
            blocks: new Map()
        };

        this.gameState = {
            status: 'INITIALIZING',
            startTime: null,
            lastUpdate: Date.now()
        };
    }

    async initialize(players) {
        Logger.info(`Initializing game engine for ${players.length} players`);
        players.forEach((player, index) => {
            const spawn = GAME_CONFIG.SPAWN_POSITIONS[index];
            this.entities.players.set(player.playerId, {
                playerId: player.playerId,
                nickname: player.nickname,
                x: spawn.x * GAME_CONFIG.BLOCK_SIZE,
                y: spawn.y * GAME_CONFIG.BLOCK_SIZE,
                gridX: spawn.x,
                gridY: spawn.y,
                lives: GAME_CONFIG.STARTING_LIVES,
                speed: INITIAL_SPEED,
                bombCount: 1,
                bombRange: 1,
                alive: true
            });

            this.clearSpawnArea(spawn.x, spawn.y);
        });

        this.gameState.status = 'READY';

        this.authoritativeState = new AuthoritativeGameState(this.gameRoom, this);
        this.authoritativeState.start();

        Logger.info('Game engine initialized successfully');
    }

    clearSpawnArea(centerX, centerY) {
        // Get actual grid dimensions from map data
        const gridHeight = this.mapData.initial_grid ? this.mapData.initial_grid.length : GAME_CONFIG.GRID_HEIGHT;
        const gridWidth = this.mapData.initial_grid && this.mapData.initial_grid[0] ? this.mapData.initial_grid[0].length : GAME_CONFIG.GRID_WIDTH;

        // Clear 3x3 area around spawn point to ensure safe spawn
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const x = centerX + dx;
                const y = centerY + dy;

                if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                    // Don't remove walls (value 1), only soft blocks (value 2)
                    if (this.mapData.initial_grid && this.mapData.initial_grid[y] && this.mapData.initial_grid[y][x] === 2) {
                        this.mapData.initial_grid[y][x] = 0; // Set to floor

                        // Remove from blocks entity map
                        const blockKey = `${x}_${y}`;
                        this.entities.blocks.delete(blockKey);
                    }
                }
            }
        }
    }


    processPlayerMove(playerId, direction, sequenceNumber) {
        return this.authoritativeState.validatePlayerMove(playerId, direction, sequenceNumber);
    }

    processPlaceBomb(playerId) {
        return this.authoritativeState.validateBombPlacement(playerId);
    }

    serializeFullState() {
        return {
            players: Array.from(this.entities.players.values()),
            bombs: Array.from(this.entities.bombs.values()),
            powerups: Array.from(this.entities.powerups.values()),
            grid: this.mapData
        };
    }

    removePlayer(playerId) {
        const player = this.entities.players.get(playerId);
        if (player) {
            player.alive = false;
            this.checkWinCondition();
        }
    }
}