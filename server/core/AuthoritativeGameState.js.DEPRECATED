import { Logger } from '../utils/Logger.js';
import { MessageBuilder } from '../network/MessageBuilder.js';
import { GAME_CONFIG } from '../../shared/game-config.js';

export class AuthoritativeGameState {
    constructor(gameRoom, gameEngine) {
        this.gameRoom = gameRoom;
        this.gameEngine = gameEngine;
        this.lastStateUpdate = Date.now();
        this.stateUpdateInterval = 100; // 10 FPS state sync
        this.powerUpSpawnQueue = [];
        this.nextPowerUpId = 1;
    }

    start() {
        Logger.info('Authoritative game state started - event-driven mode');
    }

    stop() {
        // No timers to clean up in event-driven mode
    }

    // Validate and process player movement
    validatePlayerMove(playerId, direction) {
        console.log('🎮 SERVER: Validating player move for:', playerId, 'direction:', direction);
        const player = this.gameEngine.entities.players.get(playerId);
        if (!player || !player.alive) {
            console.log('❌ SERVER: Player not found or not alive:', playerId);
            return false;
        }

        const newPos = this.calculateNewPosition(player, direction);
        console.log('🎮 SERVER: Calculated new position:', newPos);
        
        // Server-side collision detection
        if (!this.isValidPosition(newPos.x, newPos.y, playerId)) {
            console.log('❌ SERVER: Invalid position, move rejected');
            return false;
        }

        // Update authoritative position
        player.gridX = newPos.x;
        player.gridY = newPos.y;
        console.log('✅ SERVER: Move validated, updating position and broadcasting');
        
        // Broadcast to all clients
        this.gameRoom.broadcast(
            MessageBuilder.playerMoved(playerId, newPos.x, newPos.y, direction)
        );
        
        // Check for power-up collection
        this.checkPowerUpCollection(playerId, newPos.x, newPos.y);
        
        return true;
    }

    // Validate bomb placement
    validateBombPlacement(playerId) {
        const player = this.gameEngine.entities.players.get(playerId);
        if (!player || !player.alive) return false;

        // Check bomb count limit
        const activeBombs = Array.from(this.gameEngine.entities.bombs.values())
            .filter(bomb => bomb.playerId === playerId);
        
        if (activeBombs.length >= player.bombCount) return false;

        // Check position availability
        const existingBomb = Array.from(this.gameEngine.entities.bombs.values())
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

        this.gameEngine.entities.bombs.set(bombId, bomb);

        // Broadcast bomb placement
        this.gameRoom.broadcast(
            MessageBuilder.bombPlaced(bombId, playerId, player.gridX, player.gridY, player.bombRange)
        );

        // Schedule explosion
        setTimeout(() => {
            this.processBombExplosion(bombId);
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
        if (this.gameEngine.mapData.initial_grid && 
            this.gameEngine.mapData.initial_grid[y] && 
            this.gameEngine.mapData.initial_grid[y][x] !== 0) {
            console.log('❌ SERVER: Map obstacle at position, cell value:', this.gameEngine.mapData.initial_grid[y][x]);
            return false;
        }

        // Check other players
        for (const [playerId, player] of this.gameEngine.entities.players.entries()) {
            if (playerId !== excludePlayerId && player.alive && 
                player.gridX === x && player.gridY === y) {
                console.log('❌ SERVER: Another player at position:', playerId);
                return false;
            }
        }

        // Check bombs
        for (const bomb of this.gameEngine.entities.bombs.values()) {
            if (bomb.gridX === x && bomb.gridY === y) {
                console.log('❌ SERVER: Bomb at position');
                return false;
            }
        }

        console.log('✅ SERVER: Position is valid');
        return true;
    }

    calculateNewPosition(player, direction) {
        let newX = player.x;
        let newY = player.y;

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
                this.gameEngine.mapData.initial_grid[explosion.gridY][explosion.gridX] === 2) {
                
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
            { dx: 1, dy: 0 }   // RIGHT
        ];

        directions.forEach(dir => {
            for (let i = 1; i <= bomb.range; i++) {
                const x = bomb.gridX + (dir.dx * i);
                const y = bomb.gridY + (dir.dy * i);

                if (x < 0 || x >= GAME_CONFIG.GRID_WIDTH || y < 0 || y >= GAME_CONFIG.GRID_HEIGHT) {
                    break;
                }

                const cell = this.gameEngine.mapData.initial_grid[y][x];
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

    checkWinCondition() {
        const alivePlayers = Array.from(this.gameEngine.entities.players.values())
            .filter(player => player.alive);

        if (alivePlayers.length <= 1) {
            const winner = alivePlayers[0] || null;
            this.gameRoom.endGame('LAST_PLAYER_STANDING', winner);
        }
    }


}