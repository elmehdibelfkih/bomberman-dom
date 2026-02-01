import { Logger } from '../utils/Logger.js';
import { MessageBuilder } from '../network/MessageBuilder.js';
import { GAME_CONFIG } from '../../shared/game-config.js';
import { AuthoritativeGameState } from './AuthoritativeGameState.js';
import { INITIAL_SPEED } from '../../shared/constants.js';
import { Player } from '../entities/Player.js';

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
            // pick configured spawn, but avoid placing players on walls/blocks
            const configuredSpawn = GAME_CONFIG.SPAWN_POSITIONS[index];
            const spawn = this.findNearestFreeCell(configuredSpawn.x, configuredSpawn.y);

            this.entities.players.set(player.playerId,
                new Player(player.playerId, player.nickname,
                    spawn.x * GAME_CONFIG.BLOCK_SIZE,
                    spawn.y * GAME_CONFIG.BLOCK_SIZE,
                    spawn.x, spawn.y)
            );

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

                        const blockKey = `${x}_${y}`;
                        this.entities.blocks.delete(blockKey);
                    }
                }
            }
        }
    }

    findNearestFreeCell(startX, startY) {
        const grid = this.mapData.initial_grid;
        const height = grid.length;
        const width = grid[0].length;

        const inBounds = (x, y) => x >= 0 && x < width && y >= 0 && y < height;

        // Clamp start into bounds if it's outside the grid so BFS begins from a valid cell
        const clampedX = Math.min(Math.max(startX, 0), width - 1);
        const clampedY = Math.min(Math.max(startY, 0), height - 1);

        // If starting cell (or its clamped equivalent) is already free (not WALL or BLOCK), return it
        if (inBounds(startX, startY)) {
            const val = grid[startY][startX];
            if (val !== 1 && val !== 2) {
                return { x: startX, y: startY };
            }
        } else {
            const val = grid[clampedY][clampedX];
            if (val !== 1 && val !== 2) {
                return { x: clampedX, y: clampedY };
            }
        }

        // BFS outward until we find a free cell (value !== WALL && !== BLOCK)
    const visited = new Set();
    const q = [];
    // start BFS from the clamped, in-bounds cell
    q.push({ x: clampedX, y: clampedY });
    visited.add(`${clampedX}_${clampedY}`);

        const dirs = [
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 }
        ];

        while (q.length > 0) {
            const cur = q.shift();
            for (const d of dirs) {
                const nx = cur.x + d.dx;
                const ny = cur.y + d.dy;
                const key = `${nx}_${ny}`;
                if (!inBounds(nx, ny) || visited.has(key)) continue;
                visited.add(key);

                const cellVal = grid[ny][nx];
                if (cellVal !== 1 && cellVal !== 2) {
                    return { x: nx, y: ny };
                }

                q.push({ x: nx, y: ny });
            }
        }

        // fallback to the clamped start if nothing found
        return { x: clampedX, y: clampedY };
    }


    processPlayerMove(playerId, direction, sequenceNumber) {
        return this.authoritativeState.validatePlayerMove(playerId, direction, sequenceNumber);
    }

    processPlayerStop(playerId, sequenceNumber) {
        return this.authoritativeState.validatePlayerStop(playerId, sequenceNumber);
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
            this.authoritativeState.checkWinCondition()
        }
    }
}