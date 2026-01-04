import { dom, eventManager } from '../../framework/index.js';
import * as consts from '../utils/consts.js';
import { MultiplayerUI } from './MultiplayerUI.js';
import { GAME_CONFIG } from '../../shared/game-config.js';

export class MultiplayerPlayerManager {
    constructor(game, networkManager) {
        this.game = game;
        this.networkManager = networkManager;
        this.players = new Map();
        this.localPlayerId = null;
        this.ui = new MultiplayerUI(game, networkManager);
        this.sequenceNumber = 0;
        this.pendingMoves = [];
        this.spawnPositions = GAME_CONFIG.SPAWN_POSITIONS;
    }

    async initializePlayers(gameData) {
        this.localPlayerId = this.networkManager.getPlayerId();
        this.players.clear();
        
        // Load player coordinate data for sprite cropping
        this.playerCoordinate = await fetch(`/game/assets/playerCoordinate.json`).then(res => res.json());
        
        // Use the player image from mapData
        const playerImage = gameData.mapData.player;
        const blockSize = gameData.mapData.block_size;
        
        gameData.players.forEach((playerData, index) => {
            const isLocal = playerData.playerId === this.localPlayerId;
            
            const player = {
                playerId: playerData.playerId,
                nickname: playerData.nickname,
                gridX: playerData.gridX,
                gridY: playerData.gridY,
                x: playerData.gridX * blockSize + 15,
                y: playerData.gridY * blockSize,
                lives: playerData.lives,
                speed: playerData.speed,
                bombCount: playerData.bombCount,
                bombRange: playerData.bombRange,
                alive: true,
                isLocal: isLocal,
                element: null,
                direction: 'Down',
                frameIndex: 0,
                movement: false,
                lastTime: performance.now(),
                MS_PER_FRAME: 100
            };
            
            this.players.set(playerData.playerId, player);
            
            if (isLocal) {
                this.createLocalPlayer(player, playerImage, blockSize);
            } else {
                this.createRemotePlayer(player, playerImage, blockSize);
            }
        });
        
        this.setupControls();
        this.updatePlayersUI();
        this.ui.updateGameStatus('PLAYING', 'Game started!');

        this.game.state.SetPause(false);
    }

    createLocalPlayer(player, playerImage, blockSize) {
        const frame = this.playerCoordinate[player.direction][player.frameIndex];
        
        player.element = dom({
            tag: 'div',
            attributes: {
                class: 'local-player',
                id: `player-${player.playerId}`,
                style: `position: absolute; width: ${frame.width}px; height: ${frame.height}px; background: url('${playerImage}') no-repeat; background-size: auto; background-position: ${frame.x} ${frame.y}; image-rendering: pixelated; transform: translate(${player.x}px, ${player.y}px); z-index: 10;`
            },
            children: []
        });
        
        const gridElement = document.getElementById('grid');
        if (gridElement) {
            gridElement.appendChild(player.element);
        }
        
        this.clearSpawnArea(player.gridX, player.gridY);
    }

    createRemotePlayer(player, playerImage, blockSize) {
        const frame = this.playerCoordinate[player.direction][player.frameIndex];
        
        player.element = dom({
            tag: 'div',
            attributes: {
                class: 'remote-player',
                id: `player-${player.playerId}`,
                style: `position: absolute; width: ${frame.width}px; height: ${frame.height}px; background: url('${playerImage}') no-repeat; background-size: auto; background-position: ${frame.x} ${frame.y}; image-rendering: pixelated; transform: translate(${player.x}px, ${player.y}px); z-index: 10;`
            },
            children: []
        });
        
        const gridElement = document.getElementById('grid');
        if (gridElement) {
            gridElement.appendChild(player.element);
        }
        
        this.clearSpawnArea(player.gridX, player.gridY);
    }

    clearSpawnArea(gridX, gridY) {
        const gridHeight = this.game.map.gridArray.length;
        const gridWidth = this.game.map.gridArray[0].length;
        
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const x = gridX + dx;
                const y = gridY + dy;
                if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                    if (this.game.map.gridArray[y] && this.game.map.gridArray[y][x] === consts.SOFT_BLOCK) {
                        this.game.map.gridArray[y][x] = consts.FLOOR;
                        const blockElement = document.querySelector(`[data-row-index="${x}"][data-col-index="${y}"]`);
                        if (blockElement) {
                            blockElement.remove();
                        }
                    }
                }
            }
        }
    }

    setupControls() {
        const localPlayer = Array.from(this.players.values()).find(p => p.isLocal);
        if (!localPlayer) return;

        eventManager.addEventListener(document.body, 'keydown', (event) => {
            if (localPlayer.dying || this.game.state.isPaused()) return;
            
            const key = event.nativeEvent.key;
            let moved = false;
            let direction = '';
            
            switch (key) {
                case 'ArrowUp':
                    direction = 'UP';
                    moved = this.movePlayer(localPlayer, direction);
                    break;
                case 'ArrowDown':
                    direction = 'DOWN';
                    moved = this.movePlayer(localPlayer, direction);
                    break;
                case 'ArrowLeft':
                    direction = 'LEFT';
                    moved = this.movePlayer(localPlayer, direction);
                    break;
                case 'ArrowRight':
                    direction = 'RIGHT';
                    moved = this.movePlayer(localPlayer, direction);
                    break;
                case ' ':
                    this.placeBomb(localPlayer);
                    break;
            }
            
            if (moved) {
                const sequenceNumber = ++this.sequenceNumber;
                this.networkManager.sendPlayerMove(direction, sequenceNumber);
                this.pendingMoves.push({ direction, sequenceNumber });
            }
        });
    }

    reconcileLocalPlayer(data) {
        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;

        // Authoritative position from server
        const serverPosition = {
            gridX: data.x,
            gridY: data.y,
        };

        // Remove processed moves from the buffer
        this.pendingMoves = this.pendingMoves.filter(move => move.sequenceNumber > data.sequenceNumber);

        // Start from the server's authoritative position
        let reconciledPosition = serverPosition;

        // Re-apply pending moves
        this.pendingMoves.forEach(move => {
            let newX = reconciledPosition.gridX;
            let newY = reconciledPosition.gridY;

            switch (move.direction) {
                case 'UP': newY--; break;
                case 'DOWN': newY++; break;
                case 'LEFT': newX--; break;
                case 'RIGHT': newX++; break;
            }
            reconciledPosition = { gridX: newX, gridY: newY };
        });
        
        // Update the player's state
        localPlayer.gridX = reconciledPosition.gridX;
        localPlayer.gridY = reconciledPosition.gridY;
        localPlayer.x = reconciledPosition.gridX * this.game.map.blockSize;
        localPlayer.y = reconciledPosition.gridY * this.game.map.blockSize;

        // Update the DOM
        if (localPlayer.element) {
            localPlayer.element.style.transform = `translate(${localPlayer.x}px, ${localPlayer.y}px)`;
        }
    }

    movePlayer(player, direction) {
        if (!player.alive) return false;
        
        let newX = player.gridX;
        let newY = player.gridY;
        
        switch (direction) {
            case 'UP': newY--; break;
            case 'DOWN': newY++; break;
            case 'LEFT': newX--; break;
            case 'RIGHT': newX++; break;
        }
        
        // Use the actual grid dimensions from the map data
        const gridHeight = this.game.map.gridArray.length;
        const gridWidth = this.game.map.gridArray[0].length;
        
        if (newX < 0 || newX >= gridWidth || newY < 0 || newY >= gridHeight) return false;
        if (!this.canMoveTo(newX, newY)) return false;
        
        player.gridX = newX;
        player.gridY = newY;
        player.x = newX * this.game.map.blockSize + 15; // Add offset like solo mode
        player.y = newY * this.game.map.blockSize;
        
        // Update direction and animation
        const directionMap = {
            'UP': 'walkingUp',
            'DOWN': 'walkingDown', 
            'LEFT': 'walkingLeft',
            'RIGHT': 'walkingRight'
        };
        
        player.direction = directionMap[direction];
        player.movement = true;
        this.updatePlayerSprite(player);
        
        if (player.element) {
            player.element.style.transform = `translate(${player.x}px, ${player.y}px)`;
        }
        
        return true;
    }

    updatePlayerSprite(player) {
        if (!player.element || !this.playerCoordinate) return;
        
        const frame = this.playerCoordinate[player.direction][player.frameIndex];
        const fx = parseFloat(frame.x);
        const fy = parseFloat(frame.y);
        
        player.element.style.width = `${frame.width}px`;
        player.element.style.height = `${frame.height}px`;
        player.element.style.backgroundPosition = `${fx}px ${fy}px`;
        
        // Animate frame for walking
        if (player.movement) {
            player.frameIndex = (player.frameIndex + 1) % this.playerCoordinate[player.direction].length;
        }
    }

    canMoveTo(gridX, gridY) {
        const gridHeight = this.game.map.gridArray.length;
        const gridWidth = this.game.map.gridArray[0].length;
        
        if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) return false;
        
        const cell = this.game.map.gridArray[gridY][gridX];
        if (cell === consts.WALL || cell === consts.SOFT_BLOCK) return false;
        
        for (const player of this.players.values()) {
            if (player.alive && player.gridX === gridX && player.gridY === gridY) {
                return false;
            }
        }
        
        if (this.game.remoteBombs) {
            for (const bomb of this.game.remoteBombs.values()) {
                if (bomb.gridX === gridX && bomb.gridY === gridY) {
                    return false;
                }
            }
        }
        
        return true;
    }

    placeBomb(player) {
        if (!player.alive) return false;
        
        const activeBombs = this.getPlayerBombs(player.playerId);
        if (activeBombs >= player.bombCount) return false;
        
        if (this.game.remoteBombs) {
            for (const bomb of this.game.remoteBombs.values()) {
                if (bomb.gridX === player.gridX && bomb.gridY === player.gridY) {
                    return false;
                }
            }
        }
        
        this.networkManager.sendPlaceBomb();
        return true;
    }

    getPlayerBombs(playerId) {
        if (!this.game.remoteBombs) return 0;
        
        let count = 0;
        for (const bomb of this.game.remoteBombs.values()) {
            if (bomb.playerId === playerId) count++;
        }
        return count;
    }

    updateRemotePlayer(data) {
        const player = this.players.get(data.playerId);
        if (!player || player.isLocal) return;
        
        player.gridX = data.gridX;
        player.gridY = data.gridY;
        player.x = data.gridX * this.game.map.blockSize + 15;
        player.y = data.gridY * this.game.map.blockSize;
        
        if (data.direction) {
            player.direction = data.direction;
            player.movement = true;
            this.updatePlayerSprite(player);
        }
        
        if (player.element) {
            player.element.style.transform = `translate(${player.x}px, ${player.y}px)`;
        }
    }

    damagePlayer(playerId, livesRemaining) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        player.lives = livesRemaining;
        this.ui.showPlayerDamaged(playerId);
        
        if (player.lives <= 0) {
            this.killPlayer(playerId);
        }
        
        this.updatePlayersUI();
    }

    killPlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        player.alive = false;
        
        if (player.element) {
            player.element.style.opacity = '0.5';
            player.element.style.filter = 'grayscale(100%)';
        }
        
        this.ui.showPlayerDied(playerId);
        this.checkWinCondition();
    }

    checkWinCondition() {
        const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);
        
        if (alivePlayers.length <= 1) {
            const winner = alivePlayers[0];
            this.handleGameOver(winner);
        }
    }

    handleGameOver(winner) {
        this.ui.showGameOver(winner);
    }

    handlePowerUpCollection(playerId, powerUpType, newStats) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        if (newStats.speed) player.speed = newStats.speed;
        if (newStats.bombCount) player.bombCount = newStats.bombCount;
        if (newStats.bombRange) player.bombRange = newStats.bombRange;
        
        this.ui.showPowerUpCollected(playerId, powerUpType);
        this.updatePlayersUI();
    }

    updatePlayersUI() {
        const playersArray = Array.from(this.players.values());
        this.ui.updatePlayerList(playersArray);
        
        const localPlayer = playersArray.find(p => p.isLocal);
        if (localPlayer) {
            this.ui.updateLocalPlayerStats(localPlayer);
        }
    }

    cleanup() {
        this.players.forEach(player => {
            if (player.element && player.element.parentNode) {
                player.element.remove();
            }
        });
        
        this.players.clear();
        this.ui.cleanup();
    }
}