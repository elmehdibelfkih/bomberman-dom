import { Logger } from '../utils/Logger.js';
import { MessageBuilder } from '../network/MessageBuilder.js';
import { GAME_CONFIG } from '../../shared/game-config.js';
import { BLOCK, BOMB, FLOOR, POWERUP_BLOCK_PASS, POWERUP_BOMB, POWERUP_BOMB_PASS, POWERUP_FLAME, POWERUP_EXTRA_LIFE, POWERUP_SPEED, WALL } from '../../shared/constants.js';

export class AuthoritativeGameState {
    constructor(gameRoom, gameEngine) {
        this.gameRoom = gameRoom;
        this.gameEngine = gameEngine;
        this.lastStateUpdate = Date.now();
        this.powerUpSpawnQueue = [];
        this.nextPowerUpId = 1;
        this.lastProcessedSequenceNumber = new Map();
    }

    validatePlayerMove(playerId, direction, sequenceNumber) {
        const lastSequenceNumber = this.lastProcessedSequenceNumber.get(playerId) || 0;
        if (sequenceNumber <= lastSequenceNumber) return false;

        const player = this.gameEngine.entities.players.get(playerId);
        if (!player || !player.alive) return false;

        const moveSpeed = player.speed;
        let newX = player.x;
        let newY = player.y;
        let actualDirection = direction;

        // Calculate intended new position
        switch (direction) {
            case 'UP': newY -= moveSpeed; break;
            case 'DOWN': newY += moveSpeed; break;
            case 'LEFT': newX -= moveSpeed; break;
            case 'RIGHT': newX += moveSpeed; break;
        }

        // Check if current position is valid with NEW direction dimensions
        // (handles rotation collision)
        const currentDimensions = this.getPlayerDimensions(player.direction || direction);
        const newDimensions = this.getPlayerDimensions(direction);
        
        // If rotating causes collision at current position, try to correct
        if (!this.isValidPosition(player.x, player.y, direction, playerId)) {
            const corrected = this.tryPositionCorrection(player.x, player.y, direction, playerId);
            if (corrected) {
                // Apply correction and stay in place (rotation only)
                player.x = corrected.x;
                player.y = corrected.y;
                player.gridX = Math.floor(corrected.x / GAME_CONFIG.BLOCK_SIZE);
                player.gridY = Math.floor(corrected.y / GAME_CONFIG.BLOCK_SIZE);
                player.direction = direction;
                player.isMoving = false;

                this.lastProcessedSequenceNumber.set(playerId, sequenceNumber);
                this.gameRoom.broadcast(
                    MessageBuilder.playerMoved(playerId, corrected.x, corrected.y, player.gridX, player.gridY, direction, sequenceNumber)
                );
                return true;
            }
            // Can't rotate here, reject the move
            return false;
        }

        // Try direct movement
        if (this.isValidPosition(newX, newY, direction, playerId)) {
            // Direct move is valid
        } else {
            // Try corner sliding
            const cornerResult = this.tryCornerSliding(player, direction, moveSpeed);
            
            if (cornerResult) {
                newX = cornerResult.x;
                newY = cornerResult.y;
                actualDirection = cornerResult.direction;
            } else {
                // Can't move, reject
                return false;
            }
        }

        // Apply the movement
        player.x = newX;
        player.y = newY;
        player.gridX = Math.floor(newX / GAME_CONFIG.BLOCK_SIZE);
        player.gridY = Math.floor(newY / GAME_CONFIG.BLOCK_SIZE);
        player.direction = actualDirection;
        player.isMoving = true;

        this.lastProcessedSequenceNumber.set(playerId, sequenceNumber);

        this.gameRoom.broadcast(
            MessageBuilder.playerMoved(playerId, newX, newY, player.gridX, player.gridY, actualDirection, sequenceNumber)
        );

        this.checkPowerUpCollection(playerId, player.gridX, player.gridY);
        return true;
    }

    tryCornerSliding(player, direction, moveSpeed) {
        const { width, height } = this.getPlayerDimensions(direction);
        const blockSize = GAME_CONFIG.BLOCK_SIZE;
        const playerId = player.playerId;

        if (direction === 'UP') {
            // Check if we can slide left
            const leftEdgeGridX = Math.floor((player.x - 10) / blockSize);
            const currentGridY = Math.floor(player.y / blockSize);
            
            if (this.isFreeSpaceInGrid(leftEdgeGridX, currentGridY - 1)) {
                const slideLeftX = player.x - moveSpeed;
                if (this.isValidPosition(slideLeftX, player.y, 'LEFT', playerId)) {
                    return { x: slideLeftX, y: player.y, direction: 'LEFT' };
                }
            }
            
            // Check if we can slide right
            const rightEdgeGridX = Math.floor((player.x + width + 10) / blockSize);
            
            if (this.isFreeSpaceInGrid(rightEdgeGridX, currentGridY - 1)) {
                const slideRightX = player.x + moveSpeed;
                if (this.isValidPosition(slideRightX, player.y, 'RIGHT', playerId)) {
                    return { x: slideRightX, y: player.y, direction: 'RIGHT' };
                }
            }
        } else if (direction === 'DOWN') {
            const leftEdgeGridX = Math.floor((player.x - 10) / blockSize);
            const bottomGridY = Math.floor((player.y + height) / blockSize);
            
            if (this.isFreeSpaceInGrid(leftEdgeGridX, bottomGridY + 1)) {
                const slideLeftX = player.x - moveSpeed;
                if (this.isValidPosition(slideLeftX, player.y, 'LEFT', playerId)) {
                    return { x: slideLeftX, y: player.y, direction: 'LEFT' };
                }
            }
            
            const rightEdgeGridX = Math.floor((player.x + width + 10) / blockSize);
            
            if (this.isFreeSpaceInGrid(rightEdgeGridX, bottomGridY + 1)) {
                const slideRightX = player.x + moveSpeed;
                if (this.isValidPosition(slideRightX, player.y, 'RIGHT', playerId)) {
                    return { x: slideRightX, y: player.y, direction: 'RIGHT' };
                }
            }
        } else if (direction === 'LEFT') {
            const currentGridX = Math.floor(player.x / blockSize);
            const topEdgeGridY = Math.floor(player.y / blockSize);
            
            if (this.isFreeSpaceInGrid(currentGridX - 1, topEdgeGridY)) {
                const slideUpY = player.y - moveSpeed;
                if (this.isValidPosition(player.x, slideUpY, 'UP', playerId)) {
                    return { x: player.x, y: slideUpY, direction: 'UP' };
                }
            }
            
            const bottomEdgeGridY = Math.floor((player.y + height) / blockSize);
            
            if (this.isFreeSpaceInGrid(currentGridX - 1, bottomEdgeGridY)) {
                const slideDownY = player.y + moveSpeed;
                if (this.isValidPosition(player.x, slideDownY, 'DOWN', playerId)) {
                    return { x: player.x, y: slideDownY, direction: 'DOWN' };
                }
            }
        } else if (direction === 'RIGHT') {
            const rightGridX = Math.floor((player.x + width) / blockSize);
            const topEdgeGridY = Math.floor(player.y / blockSize);
            
            if (this.isFreeSpaceInGrid(rightGridX + 1, topEdgeGridY)) {
                const slideUpY = player.y - moveSpeed;
                if (this.isValidPosition(player.x, slideUpY, 'UP', playerId)) {
                    return { x: player.x, y: slideUpY, direction: 'UP' };
                }
            }
            
            const bottomEdgeGridY = Math.floor((player.y + height) / blockSize);
            
            if (this.isFreeSpaceInGrid(rightGridX + 1, bottomEdgeGridY)) {
                const slideDownY = player.y + moveSpeed;
                if (this.isValidPosition(player.x, slideDownY, 'DOWN', playerId)) {
                    return { x: player.x, y: slideDownY, direction: 'DOWN' };
                }
            }
        }

        return null;
    }

    tryPositionCorrection(x, y, direction, playerId) {
        const CORRECTION_AMOUNT = 7;
        
        // Try small corrections in all directions
        const corrections = [
            { x: x - CORRECTION_AMOUNT, y: y },      // Left
            { x: x + CORRECTION_AMOUNT, y: y },      // Right
            { x: x, y: y - CORRECTION_AMOUNT },      // Up
            { x: x, y: y + CORRECTION_AMOUNT },      // Down
            { x: x - CORRECTION_AMOUNT, y: y - CORRECTION_AMOUNT }, // Top-left
            { x: x + CORRECTION_AMOUNT, y: y - CORRECTION_AMOUNT }, // Top-right
            { x: x - CORRECTION_AMOUNT, y: y + CORRECTION_AMOUNT }, // Bottom-left
            { x: x + CORRECTION_AMOUNT, y: y + CORRECTION_AMOUNT }  // Bottom-right
        ];
        
        for (const correction of corrections) {
            if (this.isValidPosition(correction.x, correction.y, direction, playerId)) {
                return correction;
            }
        }
        
        return null;
    }


    validateBombPlacement(playerId) {
        const player = this.gameEngine.entities.players.get(playerId);
        if (!player || !player.alive) return false;

        const activeBombs = Array.from(this.gameEngine.entities.bombs.values())
            .filter(bomb => bomb.playerId === playerId);

        if (activeBombs.length >= player.maxBombs) return false;

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

    isValidPosition(newX, newY, direction, playerId) {
        const gridHeight = this.gameEngine.mapData.initial_grid.length;
        const gridWidth = this.gameEngine.mapData.initial_grid[0].length;

        const playerDimensions = this.getPlayerDimensions(direction);
        const width = playerDimensions.width;
        const height = playerDimensions.height;

        const corners = [
            { x: newX, y: newY },
            { x: newX + width - 1, y: newY },
            { x: newX, y: newY + height - 1 },
            { x: newX + width - 1, y: newY + height - 1 }
        ];

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
            if (cellValue === WALL) {
                return false;
            }

            const player = this.gameEngine.entities.players.get(playerId)
            if (cellValue === BOMB && !player.bombPass) {
                return false
            }

            if (cellValue === BLOCK && !player.blockPass) {
                return false
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

    processBombExplosion(bombId) {
        const bomb = this.gameEngine.entities.bombs.get(bombId);
        if (!bomb) return;

        const explosions = this.calculateExplosions(bomb);
        const destroyedBlocks = [];
        const damagedPlayers = [];
        let spawnedPowerUp = null;

        explosions.forEach(explosion => {
            if (this.gameEngine.mapData.initial_grid[explosion.gridY] &&
                this.gameEngine.mapData.initial_grid[explosion.gridY][explosion.gridX] === BLOCK) {

                this.gameEngine.mapData.initial_grid[explosion.gridY][explosion.gridX] = FLOOR;
                destroyedBlocks.push({ gridX: explosion.gridX, gridY: explosion.gridY });

                if (Math.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE) {
                    spawnedPowerUp = this.spawnPowerUp(explosion.gridX, explosion.gridY);
                }
            }

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

        this.gameEngine.entities.bombs.delete(bombId);

        this.gameRoom.broadcast(
            MessageBuilder.bombExploded(bombId, explosions, destroyedBlocks, damagedPlayers, spawnedPowerUp)
        );

        this.checkWinCondition();
    }

    spawnPowerUp(gridX, gridY) {
        const powerUpTypes = [POWERUP_SPEED, POWERUP_BOMB, POWERUP_FLAME, POWERUP_BOMB_PASS];
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

        this.gameRoom.broadcast(
            MessageBuilder.powerupSpawned(powerUpId, type, gridX, gridY)
        );

        return powerUp;
    }

    checkPowerUpCollection(playerId, gridX, gridY) {
        for (const [powerUpId, powerUp] of this.gameEngine.entities.powerups.entries()) {
            if (powerUp.gridX === gridX && powerUp.gridY === gridY) {
                const player = this.gameEngine.entities.players.get(playerId);
                if (!player) continue;

                const newStats = this.applyPowerUp(player, powerUp.type);

                if (powerUp.type !== POWERUP_EXTRA_LIFE) {
                    this.powerUpSchedule(player, powerUp.type)
                }

                this.gameEngine.entities.powerups.delete(powerUpId);

                this.gameRoom.broadcast(
                    MessageBuilder.powerupCollected(playerId, powerUpId, powerUp.type, newStats)
                );

                break;
            }
        }
    }

    powerUpSchedule(player, type) {
        if (player.powerUpTimers.has(type)) {
            clearTimeout(player.powerUpTimers.get(type))
        }

        const powerUpTimerId = setTimeout(() => {
            player.powerUpTimers.delete(powerUpTimerId)
            this.removePowerUp(player, type)
        }, 4000);

        player.powerUpTimers.set(type, powerUpTimerId)
    }

    removePowerUp(player, type) {
        switch (type) {
            case POWERUP_SPEED:
                player.speed--
                break;
            case POWERUP_BOMB:
                player.maxBombs--
                break;
            case POWERUP_FLAME:
                player.bombRange--
                break;
            case POWERUP_BOMB_PASS:
                player.bombPass--
                break
            case POWERUP_BLOCK_PASS:
                player.blockPass--
                break
        }
    }

    applyPowerUp(player, type) {
        switch (type) {
            case POWERUP_SPEED:
                player.speed = Math.min(player.speed + 1, 5);
                break;
            case POWERUP_BOMB:
                player.maxBombs = Math.min(player.maxBombs + 1, 5);
                break;
            case POWERUP_FLAME:
                player.bombRange = Math.min(player.bombRange + 1, 5);
            case POWERUP_BOMB_PASS:
                player.bombPass = Math.min(player.bombPass + 1, 5)
                break;
            case POWERUP_BLOCK_PASS:
                player.blockPass = Math.min(player.blockPass + 1, 5)
                break;
            case POWERUP_EXTRA_LIFE:
                player.lives = Math.min(player.lives + 1, 5)
                break;
        }

        return {
            speed: player.speed,
            maxBombs: player.maxBombs,
            bombRange: player.bombRange,
            bombPass: player.bombPass,
            blockPass: player.blockPass,
            lives: player.lives
        };
    }

    calculateExplosions(bomb) {
        const explosions = [{ gridX: bomb.gridX, gridY: bomb.gridY }];
        const directions = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
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

    isFreeSpaceInGrid(gridX, gridY) {
        const gridHeight = this.gameEngine.mapData.initial_grid.length;
        const gridWidth = this.gameEngine.mapData.initial_grid[0].length;

        if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
            return false;
        }
        const cellValue = this.gameEngine.mapData.initial_grid[gridY][gridX];
        return cellValue !== WALL && cellValue !== BLOCK;
    }
}