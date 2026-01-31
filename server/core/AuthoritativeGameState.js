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

        this.lastProcessedSequenceNumber.set(playerId, sequenceNumber);

        return true;
    }

    // Start authoritative tick loop (60 FPS)
    start() {
        if (this._tickInterval) return;
        const tickMs = 1000 / 60;
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
            // Determine intended pixel movement
            let dx = 0;
            let dy = 0;
            switch (player.direction) {
                case 'UP': dy = -player.speed; break;
                case 'DOWN': dy = player.speed; break;
                case 'LEFT': dx = -player.speed; break;
                case 'RIGHT': dx = player.speed; break;
            }

            const tryX = player.x + dx;
            const tryY = player.y + dy;

            // Helper to compute player's bbox size; use GAME_CONFIG.BLOCK_SIZE scaled
            // Use a slightly smaller hitbox so players can traverse narrow passages and
            // move across multiple floor tiles without getting stuck on edges.
            const playerSize = Math.max(1, Math.round(GAME_CONFIG.BLOCK_SIZE * 0.4));

            // Attempt full move first
            if (this.isPositionFree(tryX, tryY, player, playerSize)) {
                player.x = tryX;
                player.y = tryY;
            } else if (this.isPositionFree(tryX, player.y, player, playerSize)) {
                // try sliding on X axis only
                player.x = tryX;
            } else if (this.isPositionFree(player.x, tryY, player, playerSize)) {
                // try sliding on Y axis only
                player.y = tryY;
            } else {
                // fully blocked: stop movement and notify
                player.isMoving = false;
                this.gameRoom.broadcast(MessageBuilder.playerStopped(player.playerId, this.lastProcessedSequenceNumber.get(player.playerId) || 0));
                continue;
            }

            // Update grid coordinates from pixel position
            const newGridX = Math.floor(player.x / GAME_CONFIG.BLOCK_SIZE);
            const newGridY = Math.floor(player.y / GAME_CONFIG.BLOCK_SIZE);
            player.gridX = newGridX;
            player.gridY = newGridY;

            // Broadcast updated position
            this.gameRoom.broadcast(MessageBuilder.playerMoved(
                player.playerId,
                Math.round(player.x),
                Math.round(player.y),
                player.gridX,
                player.gridY,
                player.direction,
                this.lastProcessedSequenceNumber.get(player.playerId) || 0
            ));

            // Check for powerup collection at the new grid cell
            this.checkPowerUpCollection(player.playerId, player.gridX, player.gridY);
        }
    }

    // Pixel-based collision check: compute player's bounding box at (x,y)
    isPositionFree(x, y, player, size) {
        const grid = this.gameEngine.mapData.initial_grid;
        if (!grid || !grid.length) return false;

        const gridHeight = grid.length;
        const gridWidth = grid[0].length;

        // Ensure within world bounds (using player's bbox)
        if (x < 0 || y < 0) return false;
        if (x + size > gridWidth * GAME_CONFIG.BLOCK_SIZE) return false;
        if (y + size > gridHeight * GAME_CONFIG.BLOCK_SIZE) return false;

        // Compute covered grid cells by bbox
        const left = Math.floor(x / GAME_CONFIG.BLOCK_SIZE);
        const top = Math.floor(y / GAME_CONFIG.BLOCK_SIZE);
        const right = Math.floor((x + size - 1) / GAME_CONFIG.BLOCK_SIZE);
        const bottom = Math.floor((y + size - 1) / GAME_CONFIG.BLOCK_SIZE);

        // Check bombs collision first
        for (const bomb of this.gameEngine.entities.bombs.values()) {
            if (!bomb) continue;
            if (bomb.gridX >= left && bomb.gridX <= right && bomb.gridY >= top && bomb.gridY <= bottom) {
                // Allow the owner to walk over their own bomb so they can step off after placing it.
                if (bomb.playerId === player.playerId) continue;
                if (!player.bombPass) return false;
            }
        }

    // Allow a small overlap tolerance (in pixels) to avoid sticking on 1-2px edges.
    // Keep this relatively small since we reduced the player hitbox.
    const overlapTolerance = Math.max(1, Math.floor(GAME_CONFIG.BLOCK_SIZE * 0.08));

        for (let gy = top; gy <= bottom; gy++) {
            for (let gx = left; gx <= right; gx++) {
                if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) return false;
                const cellValue = grid[gy][gx];
                if (cellValue === WALL || (cellValue === BLOCK && !player.blockPass)) {
                    // compute overlap rectangle between player's bbox and this cell in pixels
                    const cellLeft = gx * GAME_CONFIG.BLOCK_SIZE;
                    const cellTop = gy * GAME_CONFIG.BLOCK_SIZE;
                    const cellRight = cellLeft + GAME_CONFIG.BLOCK_SIZE;
                    const cellBottom = cellTop + GAME_CONFIG.BLOCK_SIZE;

                    const overlapLeft = Math.max(x, cellLeft);
                    const overlapTop = Math.max(y, cellTop);
                    const overlapRight = Math.min(x + size, cellRight);
                    const overlapBottom = Math.min(y + size, cellBottom);

                    const overlapWidth = Math.max(0, overlapRight - overlapLeft);
                    const overlapHeight = Math.max(0, overlapBottom - overlapTop);
                    const overlapArea = overlapWidth * overlapHeight;

                    // If overlap area is small (below tolerance area), allow it; otherwise block.
                    if (overlapArea > overlapTolerance * overlapTolerance) {
                        return false;
                    }
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