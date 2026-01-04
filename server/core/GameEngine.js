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
    }

    async initialize(players) {
        Logger.info(`Initializing game engine for ${players.length} players`);

        // Initialize players at spawn positions
        const spawnPositions = GAME_CONFIG.SPAWN_POSITIONS;

        players.forEach((player, index) => {
            const spawn = spawnPositions[index];
            this.entities.players.set(player.playerId, {
                playerId: player.playerId,
                nickname: player.nickname,
                x: spawn.x * GAME_CONFIG.BLOCK_SIZE,
                y: spawn.y * GAME_CONFIG.BLOCK_SIZE,
                gridX: spawn.x,
                gridY: spawn.y,
                lives: GAME_CONFIG.STARTING_LIVES,
                speed: 1,
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


    // Validate and process bomb placement
    processPlaceBomb(playerId) {
        const player = this.entities.players.get(playerId);
        if (!player || !player.alive) return false;

        // Check bomb count limit
        const activeBombs = Array.from(this.entities.bombs.values())
            .filter(bomb => bomb.playerId === playerId);

        if (activeBombs.length >= player.bombCount) return false;

        // Check position availability
        const existingBomb = Array.from(this.entities.bombs.values())
            .find(bomb => bomb.gridX === player.gridX && bomb.gridY === player.gridY);

        if (existingBomb) return false;

        // Create authoritative bomb
        const bombId = `bomb_${Date.now()}_${playerId}`;
        const bomb = {
            bombId,
            playerId,
            gridX: player.gridX,
            gridY: player.gridY,
            range: player.bombRange,
            timer: GAME_CONFIG.BOMB_TIMER,
            createdAt: Date.now()
        };

        this.entities.bombs.set(bombId, bomb);

        // Broadcast bomb placement
        this.gameRoom.broadcast(
            MessageBuilder.bombPlaced(bombId, playerId, player.gridX, player.gridY, player.bombRange)
        );

        // Schedule explosion
        setTimeout(() => {
            this.explodeBomb(bombId);
        }, GAME_CONFIG.BOMB_TIMER);

        return true;
    }

    // Server-side collision detection
    isValidPosition(x, y, excludePlayerId = null) {
        console.log('🔍 SERVER: Checking position validity:', { x, y, excludePlayerId });

        // Check bounds
        if (x < 0 || x >= GAME_CONFIG.GRID_WIDTH || y < 0 || y >= GAME_CONFIG.GRID_HEIGHT) {
            console.log('❌ SERVER: Position out of bounds');
            return false;
        }

        // Check map obstacles
        if (this.mapData.initial_grid &&
            this.mapData.initial_grid[y] &&
            this.mapData.initial_grid[y][x] !== 0) {
            console.log('❌ SERVER: Map obstacle at position, cell value:', this.mapData.initial_grid[y][x]);
            return false;
        }

        // Check other players
        for (const [playerId, player] of this.entities.players.entries()) {
            if (playerId !== excludePlayerId && player.alive &&
                player.gridX === x && player.gridY === y) {
                console.log('❌ SERVER: Another player at position:', playerId);
                return false;
            }
        }

        // Check bombs
        for (const bomb of this.entities.bombs.values()) {
            if (bomb.gridX === x && bomb.gridY === y) {
                console.log('❌ SERVER: Bomb at position');
                return false;
            }
        }

        console.log('✅ SERVER: Position is valid');
        return true;
    }

    // Process bomb explosion with authoritative damage
    explodeBomb(bombId) {
        const bomb = this.entities.bombs.get(bombId);
        if (!bomb) return;

        const explosions = this.calculateExplosions(bomb);
        const destroyedBlocks = [];
        const damagedPlayers = [];
        let spawnedPowerUp = null;

        // Process explosions
        explosions.forEach(explosion => {
            // Destroy blocks and potentially spawn power-ups
            if (this.mapData.initial_grid[explosion.gridY] &&
                this.mapData.initial_grid[explosion.gridY][explosion.gridX] === 2) {

                this.mapData.initial_grid[explosion.gridY][explosion.gridX] = 0;
                destroyedBlocks.push({ gridX: explosion.gridX, gridY: explosion.gridY });

                // Fair power-up distribution
                if (Math.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE) {
                    spawnedPowerUp = this.spawnPowerUp(explosion.gridX, explosion.gridY);
                }
            }

            // Damage players
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
            MessageBuilder.bombExploded(bombId, explosions, destroyedBlocks, damagedPlayers, spawnedPowerUp)
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

    calculateExplosions(bomb) {
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

                if (x < 0 || x >= GAME_CONFIG.GRID_WIDTH || y < 0 || y >= GAME_CONFIG.GRID_HEIGHT) {
                    break;
                }

                const cell = this.mapData.initial_grid[y][x];
                if (cell === 1) { // Wall
                    break;
                } else if (cell === 2) { // Soft block
                    explosions.push({ gridX: x, gridY: y });
                    break;
                } else {
                    explosions.push({ gridX: x, gridY: y });
                }
            }
        });

        return explosions;
    }

    // Power-up spawning system
    spawnPowerUp(gridX, gridY) {
        const powerUpTypes = ['SPEED', 'BOMB_COUNT', 'BOMB_RANGE'];
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];

        const powerUpId = `powerup_${Date.now()}_${gridX}_${gridY}`;
        const powerUp = {
            powerUpId,
            type,
            gridX,
            gridY,
            createdAt: Date.now()
        };

        this.entities.powerups.set(powerUpId, powerUp);

        // Broadcast power-up spawn
        this.gameRoom.broadcast(
            MessageBuilder.powerupSpawned(powerUpId, type, gridX, gridY)
        );

        return powerUp;
    }

    // Check power-up collection
    checkPowerUpCollection(playerId, gridX, gridY) {
        for (const [powerUpId, powerUp] of this.entities.powerups.entries()) {
            if (powerUp.gridX === gridX && powerUp.gridY === gridY) {
                const player = this.entities.players.get(playerId);
                if (!player) continue;

                // Apply power-up effect
                const newStats = this.applyPowerUp(player, powerUp.type);

                // Remove power-up
                this.entities.powerups.delete(powerUpId);

                // Broadcast collection
                this.gameRoom.broadcast(
                    MessageBuilder.powerupCollected(playerId, powerUpId, powerUp.type, newStats)
                );

                break;
            }
        }
    }

    applyPowerUp(player, type) {
        switch (type) {
            case 'SPEED':
                player.speed = Math.min(player.speed + 1, 5);
                break;
            case 'BOMB_COUNT':
                player.bombCount = Math.min(player.bombCount + 1, 5);
                break;
            case 'BOMB_RANGE':
                player.bombRange = Math.min(player.bombRange + 1, 5);
                break;
        }

        return {
            speed: player.speed,
            bombCount: player.bombCount,
            bombRange: player.bombRange
        };
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