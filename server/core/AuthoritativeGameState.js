import { Logger } from '../utils/Logger.js';
import { MessageBuilder } from '../network/MessageBuilder.js';
import { GAME_CONFIG } from '../../shared/game-config.js';
import { BLOCK, BOMB, WALL } from '../../shared/constants.js';

export class AuthoritativeGameState {
    constructor(gameRoom, gameEngine) {
        this.gameRoom = gameRoom;
        this.gameEngine = gameEngine;
        this.lastStateUpdate = Date.now();
        this.powerUpSpawnQueue = [];
        this.nextPowerUpId = 1;
        this.lastProcessedSequenceNumber = new Map();
    }

    start() {
        Logger.info('Authoritative game state started - event-driven mode');
    }

    stop() {
        // No timers to clean up in event-driven mode
    }

    // Validate and process player movement
    validatePlayerMove(playerId, direction, sequenceNumber) {
        const lastSequenceNumber = this.lastProcessedSequenceNumber.get(playerId) || 0;
        if (sequenceNumber <= lastSequenceNumber) return false;

        const player = this.gameEngine.entities.players.get(playerId);
        if (!player || !player.alive) return false;

        const moveSpeed = player.speed;
        let newX = player.x;
        let newY = player.y;

        switch (direction) {
            case 'UP': newY -= moveSpeed; break;
            case 'DOWN': newY += moveSpeed; break;
            case 'LEFT': newX -= moveSpeed; break;
            case 'RIGHT': newX += moveSpeed; break;
        }

        if (!this.isValidPosition(newX, newY, direction, playerId)) return false;

        player.x = newX;
        player.y = newY;
        player.gridX = Math.floor(newX / GAME_CONFIG.BLOCK_SIZE);
        player.gridY = Math.floor(newY / GAME_CONFIG.BLOCK_SIZE);

        this.lastProcessedSequenceNumber.set(playerId, sequenceNumber);

        this.gameRoom.broadcast(
            MessageBuilder.playerMoved(playerId, newX, newY, player.gridX, player.gridY, direction, sequenceNumber)
        );

        this.checkPowerUpCollection(playerId, player.gridX, player.gridY);
        return true;
    }


    validateBombPlacement(playerId) {
        const player = this.gameEngine.entities.players.get(playerId);
        if (!player || !player.alive) return false;

        const activeBombs = Array.from(this.gameEngine.entities.bombs.values())
            .filter(bomb => bomb.playerId === playerId);

        if (activeBombs.length >= player.bombCount) return false;

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

        this.gameEngine.entities.bombs.set(bombId, bomb);

        this.gameRoom.broadcast(
            MessageBuilder.bombPlaced(bombId, playerId, player.gridX, player.gridY, player.bombRange)
        );

        setTimeout(() => {
            this.processBombExplosion(bombId);
        }, GAME_CONFIG.BOMB_TIMER);

        return true;
    }

    isValidPosition(newX, newY, direction) {
        const gridHeight = this.gameEngine.mapData.initial_grid.length;
        const gridWidth = this.gameEngine.mapData.initial_grid[0].length;

        const playerDimensions = this.getPlayerDimensions(direction);
        const width = playerDimensions.width;
        const height = playerDimensions.height;

        // future player's position, but by his corners
        const corners = [
            { x: newX, y: newY },
            { x: newX + width - 1, y: newY },
            { x: newX, y: newY + height - 1 },
            { x: newX + width - 1, y: newY + height - 1 }
        ];

        // check if those positions aren't filled with a block or wall
        for (const corner of corners) {
            const gridX = Math.floor(corner.x / GAME_CONFIG.BLOCK_SIZE);
            const gridY = Math.floor(corner.y / GAME_CONFIG.BLOCK_SIZE);

            if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
                return false;
            }

            for (const bomb of this.gameEngine.entities.bombs.values()) {
                if (bomb.gridX === gridX && bomb.gridY === gridY) {
                    return false;
                }
            }

            const cellValue = this.gameEngine.mapData.initial_grid[gridY][gridX];
            if (cellValue === WALL || cellValue === BLOCK || cellValue === BOMB) {
                return false;
            }
        }

        return true;
    }

    getPlayerDimensions(direction) {
        switch (direction) {
            case 'LEFT':
            case 'RIGHT':
                return { width: 25, height: 64 };
            case 'UP':
            case 'DOWN':
                return { width: 33, height: 64 };
            default:
                return { width: 33, height: 64 };
        }
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

    // Process bomb explosion with authoritative damage
    processBombExplosion(bombId) {
        const bomb = this.gameEngine.entities.bombs.get(bombId);
        if (!bomb) return;

        const explosions = this.calculateExplosions(bomb);
        const destroyedBlocks = [];
        const damagedPlayers = [];
        let spawnedPowerUp = null;

        // Process explosions
        explosions.forEach(explosion => {
            // Destroy blocks and potentially spawn power-ups
            if (this.gameEngine.mapData.initial_grid[explosion.gridY] &&
                this.gameEngine.mapData.initial_grid[explosion.gridY][explosion.gridX] === BLOCK) {

                this.gameEngine.mapData.initial_grid[explosion.gridY][explosion.gridX] = 0;
                destroyedBlocks.push({ gridX: explosion.gridX, gridY: explosion.gridY });

                // Fair power-up distribution
                if (Math.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE) {
                    spawnedPowerUp = this.spawnPowerUp(explosion.gridX, explosion.gridY);
                }
            }

            // Damage players
            this.gameEngine.entities.players.forEach(player => {
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
        this.gameEngine.entities.bombs.delete(bombId);

        // Broadcast explosion
        this.gameRoom.broadcast(
            MessageBuilder.bombExploded(bombId, explosions, destroyedBlocks, damagedPlayers, spawnedPowerUp)
        );

        // Check win condition
        this.checkWinCondition();
    }

    // Fair power-up distribution system
    spawnPowerUp(gridX, gridY) {
        const powerUpTypes = ['SPEED', 'BOMB_COUNT', 'BOMB_RANGE'];
        const type = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];

        const powerUpId = `powerup_${this.nextPowerUpId++}`;
        const powerUp = {
            powerUpId,
            type,
            gridX,
            gridY,
            createdAt: Date.now()
        };

        this.gameEngine.entities.powerups.set(powerUpId, powerUp);

        // Broadcast power-up spawn
        this.gameRoom.broadcast(
            MessageBuilder.powerupSpawned(powerUpId, type, gridX, gridY)
        );

        return powerUp;
    }

    // Check power-up collection
    checkPowerUpCollection(playerId, gridX, gridY) {
        for (const [powerUpId, powerUp] of this.gameEngine.entities.powerups.entries()) {
            if (powerUp.gridX === gridX && powerUp.gridY === gridY) {
                const player = this.gameEngine.entities.players.get(playerId);
                if (!player) continue;

                // Apply power-up effect
                const newStats = this.applyPowerUp(player, powerUp.type);

                // Remove power-up
                this.gameEngine.entities.powerups.delete(powerUpId);

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

    calculateExplosions(bomb) {
        const explosions = [{ gridX: bomb.gridX, gridY: bomb.gridY }];
        const directions = [
            { dx: 0, dy: -1 }, // UP
            { dx: 0, dy: 1 },  // DOWN
            { dx: -1, dy: 0 }, // LEFT
            { dx: 1, dy: 0 }
        ];

        directions.forEach(dir => {
            for (let i = 1; i <= bomb.range; i++) {
                const x = bomb.gridX + (dir.dx * i);
                const y = bomb.gridY + (dir.dy * i);

                if (x < 0 || x >= GAME_CONFIG.GRID_WIDTH || y < 0 || y >= GAME_CONFIG.GRID_HEIGHT) {
                    break;
                }

                const cell = this.gameEngine.mapData.initial_grid[y][x];
                if (cell === WALL) {
                    break
                } else if (cell === BLOCK) {
                    explosions.push({ gridX: x, gridY: y });
                    break;
                } else {
                    explosions.push({ gridX: x, gridY: y });
                }
            }
        });

        return explosions;
    }

    checkWinCondition() {
        const alivePlayers = Array.from(this.gameEngine.entities.players.values())
            .filter(player => player.alive);

        if (alivePlayers.length <= 1) {
            const winner = alivePlayers[0] || null;
            this.gameRoom.endGame('LAST_PLAYER_STANDING', winner);
        }
    }


}