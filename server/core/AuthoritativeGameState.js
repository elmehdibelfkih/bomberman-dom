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
        this._tickInterval = null;
    }

    validatePlayerMove(playerId, direction, sequenceNumber) {
        // Server-side movement is now authoritative and runs on a tick loop.
        // Client sends MOVE messages to indicate intent; server records the
        // last processed sequenceNumber and sets the player's direction/isMoving.
        const lastSequenceNumber = this.lastProcessedSequenceNumber.get(playerId) || 0;
        if (sequenceNumber <= lastSequenceNumber) return false;

        const player = this.gameEngine.entities.players.get(playerId);
        if (!player || !player.alive) return false;

        // Set movement intent; actual position updates happen in the tick loop
        player.direction = direction;
        player.isMoving = true;

        // Check collision for each step when moving multiple blocks
        const steps = player.speed > 3 ? 2 : 1;
        const stepSize = GAME_CONFIG.BLOCK_SIZE;
        const playerSize = Math.round(GAME_CONFIG.BLOCK_SIZE * 0.7);
        let currentX = player.x;
        let currentY = player.y;
        
        for (let step = 1; step <= steps; step++) {
            let nextX = currentX;
            let nextY = currentY;
            
            switch (direction) {
                case 'UP': nextY -= stepSize; break;
                case 'DOWN': nextY += stepSize; break;
                case 'LEFT': nextX -= stepSize; break;
                case 'RIGHT': nextX += stepSize; break;
                default: break;
            }
            
            if (!this.isPositionFree(nextX, nextY, player, playerSize)) {
                break;
            }
            
            currentX = nextX;
            currentY = nextY;
        }
        
        let moved = false;
        if (currentX !== player.x || currentY !== player.y) {
            player.x = currentX;
            player.y = currentY;

            const newGridX = Math.floor((player.x + playerSize/2) / GAME_CONFIG.BLOCK_SIZE);
            const newGridY = Math.floor((player.y + playerSize/2) / GAME_CONFIG.BLOCK_SIZE);
            player.gridX = newGridX;
            player.gridY = newGridY;

            this.gameRoom.broadcast(MessageBuilder.playerMoved(
                player.playerId,
                Math.round(player.x),
                Math.round(player.y),
                player.gridX,
                player.gridY,
                direction,
                sequenceNumber
            ));

            // After a successful step, check for power-up collection on new cell
            this.checkPowerUpCollection(player.playerId, player.gridX, player.gridY);
            moved = true;
        }

        // Immediately stop movement intent to enforce single-step
        player.direction = direction;
        player.isMoving = false;

        this.lastProcessedSequenceNumber.set(playerId, sequenceNumber);

        // Notify clients that movement is stopped after the step
        this.gameRoom.broadcast(MessageBuilder.playerStopped(player.playerId, sequenceNumber));

        return moved;
    }

    validatePlayerStop(playerId, sequenceNumber) {
        const lastSequenceNumber = this.lastProcessedSequenceNumber.get(playerId) || 0;
        if (sequenceNumber <= lastSequenceNumber) return false;

        const player = this.gameEngine.entities.players.get(playerId);
        if (!player) return false;

        player.isMoving = false;
        this.lastProcessedSequenceNumber.set(playerId, sequenceNumber);
        this.gameRoom.broadcast(MessageBuilder.playerStopped(playerId, sequenceNumber));
        return true;
    }

    // Start authoritative tick loop (30 FPS for better performance)
    start() {
        if (this._tickInterval) return;
        const tickMs = 1000 / 30; // Reduced from 60 to 30 FPS
        this._tickInterval = setInterval(() => this._step(), tickMs);
    }

    stop() {
        if (this._tickInterval) {
            clearInterval(this._tickInterval);
            this._tickInterval = null;
        }
    }

    _step() {
        // Advance players by pixel amounts based on their speed and direction
        for (const player of this.gameEngine.entities.players.values()) {
            if (!player || !player.alive || !player.isMoving || !player.direction) continue;
            
            // Use larger movement distance for 30 FPS (6 pixels per frame)
            const moveSpeed = 6;
            
            let dx = 0;
            let dy = 0;
            switch (player.direction) {
                case 'UP': dy = -moveSpeed; break;
                case 'DOWN': dy = moveSpeed; break;
                case 'LEFT': dx = -moveSpeed; break;
                case 'RIGHT': dx = moveSpeed; break;
            }

            const tryX = player.x + dx;
            const tryY = player.y + dy;

            // Use proper player hitbox (slightly smaller than block for smooth passage)
            const playerSize = Math.round(GAME_CONFIG.BLOCK_SIZE * 0.7); // 70% of block size

            // Store old grid position
            const oldGridX = player.gridX;
            const oldGridY = player.gridY;

            // Attempt movement with proper collision detection
            if (this.isPositionFree(tryX, tryY, player, playerSize)) {
                player.x = tryX;
                player.y = tryY;
                
                // Update grid coordinates
                const newGridX = Math.floor((player.x + playerSize/2) / GAME_CONFIG.BLOCK_SIZE);
                const newGridY = Math.floor((player.y + playerSize/2) / GAME_CONFIG.BLOCK_SIZE);
                
                // Check for powerup collection on intermediate positions
                const minGridX = Math.min(oldGridX, newGridX);
                const maxGridX = Math.max(oldGridX, newGridX);
                const minGridY = Math.min(oldGridY, newGridY);
                const maxGridY = Math.max(oldGridY, newGridY);
                
                for (let gx = minGridX; gx <= maxGridX; gx++) {
                    for (let gy = minGridY; gy <= maxGridY; gy++) {
                        if (gx !== oldGridX || gy !== oldGridY) {
                            this.checkPowerUpCollection(player.playerId, gx, gy);
                        }
                    }
                }
                
                // Only broadcast if position actually changed significantly
                if (player.gridX !== newGridX || player.gridY !== newGridY) {
                    player.gridX = newGridX;
                    player.gridY = newGridY;
                    
                    // Broadcast position update
                    this.gameRoom.broadcast(MessageBuilder.playerMoved(
                        player.playerId,
                        Math.round(player.x),
                        Math.round(player.y),
                        player.gridX,
                        player.gridY,
                        player.direction,
                        this.lastProcessedSequenceNumber.get(player.playerId) || 0
                    ));
                }
            } else {
                // Movement blocked - stop player
                player.isMoving = false;
                this.gameRoom.broadcast(MessageBuilder.playerStopped(
                    player.playerId, 
                    this.lastProcessedSequenceNumber.get(player.playerId) || 0
                ));
            }
        }
    }

    // Improved collision detection - no wall clipping allowed
    isPositionFree(x, y, player, size) {
        const grid = this.gameEngine.mapData.initial_grid;
        if (!grid || !grid.length) return false;

        const gridHeight = grid.length;
        const gridWidth = grid[0].length;

        // Strict bounds checking - no partial overlap with world edges
        if (x < 0 || y < 0) return false;
        if (x + size > gridWidth * GAME_CONFIG.BLOCK_SIZE) return false;
        if (y + size > gridHeight * GAME_CONFIG.BLOCK_SIZE) return false;

        // Calculate which grid cells the player's bounding box covers
        const left = Math.floor(x / GAME_CONFIG.BLOCK_SIZE);
        const top = Math.floor(y / GAME_CONFIG.BLOCK_SIZE);
        const right = Math.floor((x + size - 1) / GAME_CONFIG.BLOCK_SIZE);
        const bottom = Math.floor((y + size - 1) / GAME_CONFIG.BLOCK_SIZE);

        // Check collision with other players
        for (const otherPlayer of this.gameEngine.entities.players.values()) {
            if (!otherPlayer || otherPlayer.playerId === player.playerId || !otherPlayer.alive) continue;
            
            const otherLeft = Math.floor(otherPlayer.x / GAME_CONFIG.BLOCK_SIZE);
            const otherTop = Math.floor(otherPlayer.y / GAME_CONFIG.BLOCK_SIZE);
            const otherRight = Math.floor((otherPlayer.x + size - 1) / GAME_CONFIG.BLOCK_SIZE);
            const otherBottom = Math.floor((otherPlayer.y + size - 1) / GAME_CONFIG.BLOCK_SIZE);
            
            // Check if bounding boxes overlap
            if (left <= otherRight && right >= otherLeft && top <= otherBottom && bottom >= otherTop) {
                return false; // Players cannot pass through each other
            }
        }

        // Check bomb collisions
        for (const bomb of this.gameEngine.entities.bombs.values()) {
            if (!bomb) continue;
            if (bomb.gridX >= left && bomb.gridX <= right && bomb.gridY >= top && bomb.gridY <= bottom) {
                // Only allow bomb owner to pass through their own bomb if they have bombPass
                if (bomb.playerId === player.playerId && player.bombPass) continue;
                return false; // Cannot pass through bombs
            }
        }

        // Check each grid cell for walls and blocks - NO OVERLAP ALLOWED
        for (let gy = top; gy <= bottom; gy++) {
            for (let gx = left; gx <= right; gx++) {
                if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return false;
                
                const cellValue = grid[gy][gx];
                
                // Strict collision - no clipping into walls or blocks
                if (cellValue === WALL) {
                    return false;
                }
                
                if (cellValue === BLOCK && !player.blockPass) {
                    return false;
                }
            }
        }

        return true;
    }


    validateBombPlacement(playerId) {
        const player = this.gameEngine.entities.players.get(playerId);
        if (!player || !player.alive) return false;

        const activeBombs = Array.from(this.gameEngine.entities.bombs.values())
            .filter(bomb => bomb.playerId === playerId);

        if (activeBombs.length >= player.maxBombs) return false;

        // compute grid cell from player's current pixel position to avoid
        // placing bombs in the wrong cell if client's gridX/gridY are stale
        const gx = Math.floor(player.x / GAME_CONFIG.BLOCK_SIZE);
        const gy = Math.floor(player.y / GAME_CONFIG.BLOCK_SIZE);

        // prevent multiple bombs in same cell unless player has bombPass
        for (const b of this.gameEngine.entities.bombs.values()) {
            if (b.gridX === gx && b.gridY === gy && !player.bombPass) return false;
        }

        const bombId = `bomb_${Date.now()}_${playerId}`;
        const bomb = {
            bombId,
            playerId,
            gridX: gx,
            gridY: gy,
            range: player.bombRange,
            timer: GAME_CONFIG.BOMB_TIMER,
            createdAt: Date.now()
        };

        this.gameEngine.entities.bombs.set(bombId, bomb);

        this.gameRoom.broadcast(
            MessageBuilder.bombPlaced(bombId, playerId, bomb.gridX, bomb.gridY, player.bombRange, bomb.timer)
        );

        setTimeout(() => {
            this.processBombExplosion(bombId);
        }, GAME_CONFIG.BOMB_TIMER);

        return true;
    }

    isValidGridPosition(gridX, gridY, playerId) {
        const gridHeight = this.gameEngine.mapData.initial_grid.length;
        const gridWidth = this.gameEngine.mapData.initial_grid[0].length;

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

        const player = this.gameEngine.entities.players.get(playerId);
        if (cellValue === BOMB && !player.bombPass) {
            return false;
        }

        if (cellValue === BLOCK && !player.blockPass) {
            return false;
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

        // Process explosions
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
        // Only spawn these three power-ups: bomb (extra bomb), speed, flame (bigger explosions)
        const powerUpTypes = [POWERUP_BOMB, POWERUP_SPEED, POWERUP_FLAME];
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

                // All powerups are temporary (4 seconds) except extra life
                if (powerUp.type !== POWERUP_EXTRA_LIFE) {
                    this.powerUpSchedule(player, powerUp.type);
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
                break;
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
            { dx: 0, dy: -1 }, // up
            { dx: 0, dy: 1 },  // down
            { dx: -1, dy: 0 }, // left
            { dx: 1, dy: 0 } // right
        ];

        directions.forEach(dir => {
            for (let i = 1; i <= bomb.range; i++) {
                const x = bomb.gridX + (dir.dx * i);
                const y = bomb.gridY + (dir.dy * i);

                if (x < 0 || x >= GAME_CONFIG.GRID_WIDTH || y < 0 || y >= GAME_CONFIG.GRID_HEIGHT) {
                    break;
                }

                const cell = this.gameEngine.mapData.initial_grid[y][x];
                
                // Stop at walls - no explosion
                if (cell === WALL) {
                    break;
                }
                
                // Add explosion at this position (works for both blocks and empty spaces)
                explosions.push({ gridX: x, gridY: y });
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