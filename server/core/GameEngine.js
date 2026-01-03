import { Logger } from '../utils/Logger.js';
import { MessageBuilder } from '../network/MessageBuilder.js';
import { GAME_CONFIG } from '../../shared/game-config.js';
import { AuthoritativeGameState } from './AuthoritativeGameState.js';

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
        
        // Initialize authoritative game state
        this.authoritativeState = new AuthoritativeGameState(gameRoom, this);
    }

    async initialize(players) {
        Logger.info(`Initializing game engine for ${players.length} players`);
        
        // Initialize players at spawn positions
        const spawnPositions = [
            { x: 1, y: 1 },   // Top-left
            { x: 13, y: 1 },  // Top-right
            { x: 1, y: 9 },   // Bottom-left
            { x: 13, y: 9 }   // Bottom-right
        ];
        
        players.forEach((player, index) => {
            const spawn = spawnPositions[index];
            this.entities.players.set(player.playerId, {
                playerId: player.playerId,
                nickname: player.nickname,
                gridX: spawn.x,
                gridY: spawn.y,
                lives: GAME_CONFIG.STARTING_LIVES,
                speed: 1,
                bombCount: 1,
                bombRange: 1,
                score: 0,
                alive: true
            });
            
            // Clear spawn area (2x2 around spawn point)
            this.clearSpawnArea(spawn.x, spawn.y);
        });
        
        this.gameState.status = 'READY';
        
        // Start authoritative game state
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

    processPlayerMove(playerId, direction) {
        return this.authoritativeState.validatePlayerMove(playerId, direction);
    }

    processPlaceBomb(playerId) {
        return this.authoritativeState.validateBombPlacement(playerId);
    }

    explodeBomb(bombId) {
        const bomb = this.entities.bombs.get(bombId);
        if (!bomb) return;

        // Calculate explosion area
        const explosions = this.calculateExplosions(bomb);
        const destroyedBlocks = [];
        const damagedPlayers = [];

        // Process explosions
        explosions.forEach(explosion => {
            // Check for destroyed blocks
            const block = this.getBlockAt(explosion.gridX, explosion.gridY);
            if (block && block.destructible) {
                destroyedBlocks.push(block);
                this.entities.blocks.delete(`${explosion.gridX}_${explosion.gridY}`);
            }

            // Check for damaged players
            this.entities.players.forEach(player => {
                if (player.gridX === explosion.gridX && player.gridY === explosion.gridY && player.alive) {
                    player.lives--;
                    damagedPlayers.push({
                        playerId: player.playerId,
                        livesRemaining: player.lives
                    });

                    if (player.lives <= 0) {
                        player.alive = false;
                        this.gameRoom.broadcast(MessageBuilder.playerDied(player.playerId));
                    } else {
                        this.gameRoom.broadcast(MessageBuilder.playerDamaged(player.playerId, player.lives));
                    }
                }
            });
        });

        // Remove bomb
        this.entities.bombs.delete(bombId);

        // Broadcast explosion
        this.gameRoom.broadcast(
            MessageBuilder.bombExploded(bombId, explosions, destroyedBlocks, damagedPlayers, null)
        );

        // Check win condition
        this.checkWinCondition();
    }

    calculateNewPosition(player, direction) {
        let newX = player.gridX;
        let newY = player.gridY;

        switch (direction) {
            case 'UP': newY--; break;
            case 'DOWN': newY++; break;
            case 'LEFT': newX--; break;
            case 'RIGHT': newX++; break;
        }

        return { x: newX, y: newY };
    }

    isValidMove(x, y) {
        // Get actual grid dimensions from map data
        const gridHeight = this.mapData.initial_grid ? this.mapData.initial_grid.length : GAME_CONFIG.GRID_HEIGHT;
        const gridWidth = this.mapData.initial_grid && this.mapData.initial_grid[0] ? this.mapData.initial_grid[0].length : GAME_CONFIG.GRID_WIDTH;
        
        // Check bounds
        if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
            return false;
        }

        // Check for walls/blocks
        const block = this.getBlockAt(x, y);
        if (block) return false;

        // Check for bombs
        const bomb = Array.from(this.entities.bombs.values())
            .find(bomb => bomb.gridX === x && bomb.gridY === y);
        if (bomb) return false;

        return true;
    }

    calculateExplosions(bomb) {
        // Get actual grid dimensions from map data
        const gridHeight = this.mapData.initial_grid ? this.mapData.initial_grid.length : GAME_CONFIG.GRID_HEIGHT;
        const gridWidth = this.mapData.initial_grid && this.mapData.initial_grid[0] ? this.mapData.initial_grid[0].length : GAME_CONFIG.GRID_WIDTH;
        
        const explosions = [{ gridX: bomb.gridX, gridY: bomb.gridY }];
        const directions = [
            { dx: 0, dy: -1 }, // UP
            { dx: 0, dy: 1 },  // DOWN
            { dx: -1, dy: 0 }, // LEFT
            { dx: 1, dy: 0 }   // RIGHT
        ];

        directions.forEach(dir => {
            for (let i = 1; i <= bomb.range; i++) {
                const x = bomb.gridX + (dir.dx * i);
                const y = bomb.gridY + (dir.dy * i);

                if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
                    break;
                }

                const block = this.getBlockAt(x, y);
                if (block) {
                    if (block.destructible) {
                        explosions.push({ gridX: x, gridY: y });
                    }
                    break;
                }

                explosions.push({ gridX: x, gridY: y });
            }
        });

        return explosions;
    }

    getBlockAt(x, y) {
        return this.entities.blocks.get(`${x}_${y}`);
    }

    checkWinCondition() {
        const alivePlayers = Array.from(this.entities.players.values())
            .filter(player => player.alive);

        if (alivePlayers.length <= 1) {
            const winner = alivePlayers[0] || null;
            this.gameRoom.endGame('LAST_PLAYER_STANDING', winner);
        }
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