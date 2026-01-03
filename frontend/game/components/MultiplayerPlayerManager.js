import { dom, eventManager } from '../../framework/index.js';
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
        // Sprite/animation state
        this.playerCoordinates = null; // loaded from /game/assets/playerCoordinate.json
        this.animationId = null; // rAF id
        this.keyState = { UP: false, DOWN: false, LEFT: false, RIGHT: false };
    }

    async initializePlayers(gameData) {
        this.localPlayerId = this.networkManager.getPlayerId();
        this.players.clear();

        // Load sprite frame coordinates if not loaded
        if (!this.playerCoordinates) {
            try {
                this.playerCoordinates = await fetch(`/game/assets/playerCoordinate.json`).then(res => res.json());
            } catch (e) {
                console.error('❌ FRONTEND: Failed to load playerCoordinate.json', e);
                this.playerCoordinates = null;
            }
        }
        
        // Hide original game player sprite in multiplayer
        if (this.game.player && this.game.player.element) {
            this.game.player.element.style.display = 'none';
        }
        
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
                element: null,
                // animation state
                movement: false,
                animate: false,
                frameIndex: 0,
                lastTime: performance.now(),
                MS_PER_FRAME: 100,
                direction: 'Down',
                frame: null,
                // tween state for pixel-smooth movement
                startX: spawn.x * this.game.map.blockSize,
                startY: spawn.y * this.game.map.blockSize,
                targetX: spawn.x * this.game.map.blockSize,
                targetY: spawn.y * this.game.map.blockSize,
                moveStart: 0,
                moveDuration: 0,
                isTweening: false
            };

            // initialize frame if coordinates loaded
            if (this.playerCoordinates) {
                player.frame = this.playerCoordinates[player.direction][player.frameIndex];
            }
            
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

        // Start animation loop
        this.startAnimationLoop();

        // Unpause the game so player input works
        this.game.state.SetPause(false);
    }

    createLocalPlayer(player) {
        const blockSize = this.game.map.blockSize || 64;
        const bg = this.game.map?.level?.player || '/game/assets/images/player.png';
        player.element = dom({
            tag: 'div',
            attributes: {
                class: 'local-player',
                id: `player-${player.playerId}`,
                style: `position: absolute; transform: translate(${player.x}px, ${player.y}px); z-index: 10; filter: hue-rotate(120deg) saturate(1.5); border: 2px solid #00ff00; image-rendering: pixelated; background-image: url(${bg}); background-repeat: no-repeat;`
            },
            children: []
        });

        // Apply initial frame size/position if available
        if (player.frame) {
            const fx = parseFloat(player.frame.x);
            const fy = parseFloat(player.frame.y);
            player.element.style.width = `${player.frame.width}px`;
            player.element.style.height = `${player.frame.height}px`;
            player.element.style.backgroundPosition = `${fx}px ${fy}px`;
        } else {
            player.element.style.width = `${blockSize}px`;
            player.element.style.height = `${blockSize}px`;
        }
        
        (this.game.map?.grid || document.getElementById('grid')).appendChild(player.element);
        this.clearSpawnArea(player.gridX, player.gridY);
    }

    createRemotePlayer(player) {
        const blockSize = this.game.map.blockSize || 64;
        const bg = this.game.map?.level?.player || '/game/assets/images/player.png';
        player.element = dom({
            tag: 'div',
            attributes: {
                class: 'remote-player',
                id: `player-${player.playerId}`,
                style: `position: absolute; transform: translate(${player.x}px, ${player.y}px); z-index: 10; filter: hue-rotate(0deg) saturate(1.5); border: 2px solid #ff0000; image-rendering: pixelated; background-image: url(${bg}); background-repeat: no-repeat;`
            },
            children: []
        });

        // Apply initial frame size/position if available
        if (player.frame) {
            const fx = parseFloat(player.frame.x);
            const fy = parseFloat(player.frame.y);
            player.element.style.width = `${player.frame.width}px`;
            player.element.style.height = `${player.frame.height}px`;
            player.element.style.backgroundPosition = `${fx}px ${fy}px`;
        } else {
            player.element.style.width = `${blockSize}px`;
            player.element.style.height = `${blockSize}px`;
        }
        
        (this.game.map?.grid || document.getElementById('grid')).appendChild(player.element);
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
        console.log('🎮 FRONTEND: Setting up multiplayer controls');
        const localPlayer = Array.from(this.players.values()).find(p => p.isLocal);
        if (!localPlayer) {
            console.log('❌ FRONTEND: No local player found for controls');
            return;
        }
        console.log('🎮 FRONTEND: Local player found:', localPlayer.playerId);

        eventManager.addEventListener(document.body, 'keydown', (event) => {
            if (localPlayer.dying || this.game.state.isPaused()) return;
            
            const key = event.nativeEvent.key;
            let moved = false;
            
            switch (key) {
                case 'ArrowUp':
                    this.keyState.UP = true;
                    console.log('🎮 FRONTEND: Processing UP movement in MultiplayerPlayerManager');
                    moved = this.movePlayer(localPlayer, 'UP');
                    break;
                case 'ArrowDown':
                    this.keyState.DOWN = true;
                    console.log('🎮 FRONTEND: Processing DOWN movement in MultiplayerPlayerManager');
                    moved = this.movePlayer(localPlayer, 'DOWN');
                    break;
                case 'ArrowLeft':
                    this.keyState.LEFT = true;
                    console.log('🎮 FRONTEND: Processing LEFT movement in MultiplayerPlayerManager');
                    moved = this.movePlayer(localPlayer, 'LEFT');
                    break;
                case 'ArrowRight':
                    this.keyState.RIGHT = true;
                    console.log('🎮 FRONTEND: Processing RIGHT movement in MultiplayerPlayerManager');
                    moved = this.movePlayer(localPlayer, 'RIGHT');
                    break;
                case ' ':
                    this.placeBomb(localPlayer);
                    break;
            }
            
            if (moved) {
                console.log('🎮 FRONTEND: Player moved locally, sending to server:', key.replace('Arrow', '').toUpperCase());
                this.networkManager.sendPlayerMove(key.replace('Arrow', '').toUpperCase());
            }
        });

        // Key up to stop walking animation
        eventManager.addEventListener(document.body, 'keyup', (event) => {
            const key = event.nativeEvent.key;
            switch (key) {
                case 'ArrowUp':
                    this.keyState.UP = false;
                    if (localPlayer.direction.includes('walking')) {
                        localPlayer.direction = 'Up';
                        localPlayer.frameIndex = 0;
                        localPlayer.animate = true;
                    }
                    break;
                case 'ArrowDown':
                    this.keyState.DOWN = false;
                    if (localPlayer.direction.includes('walking')) {
                        localPlayer.direction = 'Down';
                        localPlayer.frameIndex = 0;
                        localPlayer.animate = true;
                    }
                    break;
                case 'ArrowLeft':
                    this.keyState.LEFT = false;
                    if (localPlayer.direction.includes('walking')) {
                        localPlayer.direction = 'Left';
                        localPlayer.frameIndex = 0;
                        localPlayer.animate = true;
                    }
                    break;
                case 'ArrowRight':
                    this.keyState.RIGHT = false;
                    if (localPlayer.direction.includes('walking')) {
                        localPlayer.direction = 'Right';
                        localPlayer.frameIndex = 0;
                        localPlayer.animate = true;
                    }
                    break;
            }
        });
    }

    movePlayer(player, direction) {
        console.log('🎮 FRONTEND: Attempting to move player:', player.playerId, 'direction:', direction);
        console.log('🎮 FRONTEND: Current position:', { x: player.gridX, y: player.gridY });
        
        if (!player.alive) {
            console.log('❌ FRONTEND: Player not alive');
            return false;
        }
        // Prevent spamming moves while tweening to the next cell
        if (player.isTweening) {
            return false;
        }

        // Set local animation direction and movement (server remains authoritative for position)
        switch (direction) {
            case 'UP':
                player.direction = 'walkingUp';
                break;
            case 'DOWN':
                player.direction = 'walkingDown';
                break;
            case 'LEFT':
                player.direction = 'walkingLeft';
                break;
            case 'RIGHT':
                player.direction = 'walkingRight';
                break;
        }
        player.movement = true;
        player.animate = true;
        
        // Skip client-side collision detection - let server validate
        console.log('✅ FRONTEND: Sending move to server for validation');
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
        if (!player) return;

        const prevX = player.gridX;
        const prevY = player.gridY;
        
        player.gridX = data.x;
        player.gridY = data.y;
        
        const blockSize = this.game.map.blockSize || 64;
        const newPxX = data.x * blockSize;
        const newPxY = data.y * blockSize;

        // Setup tween for pixel-smooth movement from current to target
        player.startX = player.x;
        player.startY = player.y;
        player.targetX = newPxX;
        player.targetY = newPxY;
        player.moveStart = performance.now();
        // Derive duration from player speed (pixels/frame ~ state speed); default 4 px/frame @ 60fps -> 240 px/s
        const pxPerFrame = (this.game.state?.getPlayerSpeed && player.isLocal) ? this.game.state.getPlayerSpeed() : Math.max(1, player.speed || 4);
        const pxPerSec = pxPerFrame * 60;
        player.moveDuration = Math.max(60, Math.round(blockSize / pxPerSec * 1000));
        player.isTweening = (player.startX !== player.targetX) || (player.startY !== player.targetY);

        // Determine direction and movement for animation
        let dx = player.gridX - prevX;
        let dy = player.gridY - prevY;
        if (typeof data.direction === 'string') {
            // If server provides a direction, prefer it (expects 'UP','DOWN','LEFT','RIGHT')
            switch (data.direction) {
                case 'UP': player.direction = 'walkingUp'; break;
                case 'DOWN': player.direction = 'walkingDown'; break;
                case 'LEFT': player.direction = 'walkingLeft'; break;
                case 'RIGHT': player.direction = 'walkingRight'; break;
            }
            player.movement = true;
        } else if (dx !== 0 || dy !== 0) {
            if (Math.abs(dx) > Math.abs(dy)) {
                player.direction = dx > 0 ? 'walkingRight' : 'walkingLeft';
            } else {
                player.direction = dy > 0 ? 'walkingDown' : 'walkingUp';
            }
            player.movement = true;
        } else {
            // No movement - switch to idle if previously walking
            if (player.direction && player.direction.includes('walking')) {
                player.direction = player.direction.replace('walking', '');
                player.frameIndex = 0;
                player.animate = true;
            }
            player.movement = false;
        }
        
        if (!player.isTweening && player.element) {
            player.element.style.transform = `translate(${player.x}px, ${player.y}px)`;
        }
        
        console.log('🔄 FRONTEND: Updated player position from server:', { playerId: data.playerId, x: data.x, y: data.y });
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

    // Animation Loop Control
    startAnimationLoop() {
        if (this.animationId) return;
        const step = (timestamp) => {
            try {
                this.updateAnimation(timestamp);
            } catch (e) {
                console.error('❌ FRONTEND: Animation update failed', e);
            }
            this.animationId = requestAnimationFrame(step);
        };
        this.animationId = requestAnimationFrame(step);
    }

    stopAnimationLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // Mirror solo animation update logic (frame stepping + sprite background positioning)
    updateAnimation(timestamp) {
        if (!this.playerCoordinates) return;
        const local = this.players.get(this.localPlayerId);
        const anyKey = this.keyState.UP || this.keyState.DOWN || this.keyState.LEFT || this.keyState.RIGHT;

        // Keep local walking animation while keys are held
        if (local && local.alive && !this.game.state.isPaused()) {
            if (anyKey) {
                if (this.keyState.UP) local.direction = 'walkingUp';
                else if (this.keyState.DOWN) local.direction = 'walkingDown';
                else if (this.keyState.LEFT) local.direction = 'walkingLeft';
                else if (this.keyState.RIGHT) local.direction = 'walkingRight';
                local.movement = true;
                local.animate = true;
            } else if (local.movement && local.direction.includes('walking')) {
                // Switch to idle when no keys held
                local.direction = local.direction.replace('walking', '');
                local.frameIndex = 0;
                local.animate = true;
                local.movement = false;
            }
        }

        // Update each player's frame and render
        for (const player of this.players.values()) {
            if (!player.element || !player.alive) continue;
            if (!player.direction || !this.playerCoordinates[player.direction]) continue;

            // Tween pixel position toward target for smooth movement
            if (player.isTweening) {
                const elapsed = timestamp - (player.moveStart || 0);
                const t = Math.max(0, Math.min(1, player.moveDuration ? (elapsed / player.moveDuration) : 1));
                player.x = player.startX + (player.targetX - player.startX) * t;
                player.y = player.startY + (player.targetY - player.startY) * t;
                if (t >= 1) {
                    player.x = player.targetX;
                    player.y = player.targetY;
                    player.isTweening = false;
                }
            }

            // Frame stepping
            const delta = timestamp - (player.lastTime || 0);
            if (player.movement && delta >= (player.MS_PER_FRAME || 100)) {
                player.frame = this.playerCoordinates[player.direction][player.frameIndex];
                player.lastTime = timestamp;
                player.animate = true;
                player.frameIndex = (player.frameIndex + 1) % this.playerCoordinates[player.direction].length;
            }

            // Render transform
            player.element.style.transform = `translate(${player.x}px, ${player.y}px)`;

            // Apply sprite frame
            if (player.animate) {
                // Ensure current frame is set
                player.frame = player.frame || this.playerCoordinates[player.direction][player.frameIndex] || null;
                if (player.frame) {
                    const fx = parseFloat(player.frame.x);
                    const fy = parseFloat(player.frame.y);
                    player.element.style.width = `${player.frame.width}px`;
                    player.element.style.height = `${player.frame.height}px`;
                    player.element.style.backgroundPosition = `${fx}px ${fy}px`;
                }
                player.animate = false;
            }

            // Reset movement flag for non-local players (server will set it again if they keep moving)
            if (!player.isLocal && !player.isTweening) {
                player.movement = false;
            }
        }
    }

    cleanup() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.players.forEach(player => {
            if (player.element && player.element.parentNode) {
                player.element.remove();
            }
        });
        
        this.players.clear();
        this.ui.cleanup();
    }
}