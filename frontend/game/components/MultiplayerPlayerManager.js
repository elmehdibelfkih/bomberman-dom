import { dom, eventManager } from '../../framwork/index.js';
import * as consts from '../utils/consts.js';
import { MultiplayerUI } from './MultiplayerUI.js';

export class MultiplayerPlayerManager {
    constructor(game, networkManager) {
        this.game = game;
        this.networkManager = networkManager;
        this.players = new Map();
        this.localPlayerId = null;
        this.ui = new MultiplayerUI(game, networkManager);
        this.spawnPositions = [
            { x: 1, y: 1, corner: 'top-left' },
            { x: 13, y: 1, corner: 'top-right' },
            { x: 1, y: 9, corner: 'bottom-left' },
            { x: 13, y: 9, corner: 'bottom-right' }
        ];
    }

    async initializePlayers(gameData) {
        this.localPlayerId = this.networkManager.getPlayerId();
        this.players.clear();
        
        gameData.players.forEach((playerData, index) => {
            const spawn = this.spawnPositions[index];
            const isLocal = playerData.playerId === this.localPlayerId;
            
            const player = {
                playerId: playerData.playerId,
                nickname: playerData.nickname,
                gridX: spawn.x,
                gridY: spawn.y,
                x: spawn.x * this.game.map.blockSize,
                y: spawn.y * this.game.map.blockSize,
                lives: 3,
                speed: 3,
                bombCount: 1,
                bombRange: 1,
                alive: true,
                isLocal: isLocal,
                element: null
            };
            
            this.players.set(playerData.playerId, player);
            
            if (isLocal) {
                this.createLocalPlayer(player);
            } else {
                this.createRemotePlayer(player);
            }
        });
        
        this.setupControls();
        this.updatePlayersUI();
        this.ui.updateGameStatus('PLAYING', 'Game started!');
    }

    createLocalPlayer(player) {
        player.element = dom({
            tag: 'div',
            attributes: {
                class: 'local-player',
                id: `player-${player.playerId}`,
                style: `position: absolute; width: 50px; height: 50px; background: url('/game/assets/player/player.png') no-repeat; background-size: cover; transform: translate(${player.x}px, ${player.y}px); z-index: 10; border: 2px solid #00ff00;`
            },
            children: []
        });
        
        document.getElementById('grid').appendChild(player.element);
        this.clearSpawnArea(player.gridX, player.gridY);
    }

    createRemotePlayer(player) {
        player.element = dom({
            tag: 'div',
            attributes: {
                class: 'remote-player',
                id: `player-${player.playerId}`,
                style: `position: absolute; width: 50px; height: 50px; background: url('/game/assets/player/player.png') no-repeat; background-size: cover; transform: translate(${player.x}px, ${player.y}px); z-index: 10; border: 2px solid #ff0000;`
            },
            children: []
        });
        
        document.getElementById('grid').appendChild(player.element);
        this.clearSpawnArea(player.gridX, player.gridY);
    }

    clearSpawnArea(gridX, gridY) {
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const x = gridX + dx;
                const y = gridY + dy;
                if (x >= 0 && x < 15 && y >= 0 && y < 11) {
                    if (this.game.map.gridArray[y] && this.game.map.gridArray[y][x] === consts.SOFT_BLOCK) {
                        this.game.map.gridArray[y][x] = consts.FLOOR;
                        const blockElement = document.querySelector(`[data-grid-x="${x}"][data-grid-y="${y}"]`);
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
            
            switch (key) {
                case 'ArrowUp':
                    moved = this.movePlayer(localPlayer, 'UP');
                    break;
                case 'ArrowDown':
                    moved = this.movePlayer(localPlayer, 'DOWN');
                    break;
                case 'ArrowLeft':
                    moved = this.movePlayer(localPlayer, 'LEFT');
                    break;
                case 'ArrowRight':
                    moved = this.movePlayer(localPlayer, 'RIGHT');
                    break;
                case ' ':
                    this.placeBomb(localPlayer);
                    break;
            }
            
            if (moved) {
                this.networkManager.move(key.replace('Arrow', '').toUpperCase());
            }
        });
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
        
        if (newX < 0 || newX >= 15 || newY < 0 || newY >= 11) return false;
        if (!this.canMoveTo(newX, newY)) return false;
        
        player.gridX = newX;
        player.gridY = newY;
        player.x = newX * this.game.map.blockSize;
        player.y = newY * this.game.map.blockSize;
        
        if (player.element) {
            player.element.style.transform = `translate(${player.x}px, ${player.y}px)`;
        }
        
        return true;
    }

    canMoveTo(gridX, gridY) {
        if (gridX < 0 || gridX >= 15 || gridY < 0 || gridY >= 11) return false;
        
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
        
        this.networkManager.placeBomb();
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
        player.x = data.gridX * this.game.map.blockSize;
        player.y = data.gridY * this.game.map.blockSize;
        
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