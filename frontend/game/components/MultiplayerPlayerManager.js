import { dom, eventManager } from '../../framework/index.js';
import * as consts from '../utils/consts.js';
import { MultiplayerUI } from './MultiplayerUI.js';
// import { GAME_CONFIG } from '../../shared/game-config.js';

export class MultiplayerPlayerManager {
    constructor(game, networkManager) {
        this.game = game;
        this.networkManager = networkManager;
        this.players = new Map();
        this.localPlayerId = null;
        this.ui = new MultiplayerUI(game, networkManager);
        this.sequenceNumber = 0;
        this.pendingMoves = [];
        this.lastServerUpdateTime = 0;
        this.serverUpdateInterval = 100; // ms
        // this.SPAWN_POSITIONS = GAME_CONFIG.SPAWN_POSITIONS;
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
                x: playerData.x,
                y: playerData.y,
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
            // console.log(player);

            this.players.set(playerData.playerId, player);

            if (isLocal) {
                this.createLocalPlayer(player, playerImage, blockSize);
            } else {
                this.createRemotePlayer(player, playerImage, blockSize);
            }
            console.log("==hada l player =>", player);

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
                style: `position: absolute; width: ${frame.width}px;
                height: ${frame.height}px;
                background: url('${playerImage}') no-repeat;
                background-size: auto;
                background-position: ${frame.x} ${frame.y};
                image-rendering: pixelated;
                transform: translate(${player.x}px, ${player.y}px);
                z-index: 10;`
            },
            children: []
        });

        const gridElement = document.getElementById('grid');
        if (gridElement) {
            gridElement.appendChild(player.element);
        }

        // this.clearSpawnArea(player.gridX, player.gridY);
    }

    createRemotePlayer(player, playerImage, blockSize) {
        const frame = this.playerCoordinate[player.direction][player.frameIndex];

        player.element = dom({
            tag: 'div',
            attributes: {
                class: 'remote-player',
                id: `player-${player.playerId}`,
                style: `position: absolute; width: ${frame.width}px;
                height: ${frame.height}px;
                background: url('${playerImage}') no-repeat;
                background-size: auto;
                background-position: ${frame.x} ${frame.y};
                image-rendering: pixelated;
                transform: translate(${player.x}px, ${player.y}px);
                z-index: 10;`
            },
            children: []
        });

        const gridElement = document.getElementById('grid');
        if (gridElement) {
            gridElement.appendChild(player.element);
        }

        // this.clearSpawnArea(player.gridX, player.gridY);
    }

    // clearSpawnArea(gridX, gridY) {
    //     const gridHeight = this.game.map.gridArray.length;
    //     const gridWidth = this.game.map.gridArray[0].length;

    //     for (let dx = -1; dx <= 1; dx++) {
    //         for (let dy = -1; dy <= 1; dy++) {
    //             const x = gridX + dx;
    //             const y = gridY + dy;
    //             if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
    //                 if (this.game.map.gridArray[y] && this.game.map.gridArray[y][x] === consts.SOFT_BLOCK) {
    //                     this.game.map.gridArray[y][x] = consts.FLOOR;
    //                     const blockElement = document.querySelector(`[data-row-index="${x}"][data-col-index="${y}"]`);
    //                     if (blockElement) {
    //                         blockElement.remove();
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // }

    setupControls() {
        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;

        localPlayer.canPlaceBomb = true;

        eventManager.addEventListener(document.body, 'keydown', (event) => {
            if (localPlayer.dying || this.game.state.isPaused()) return;

            const key = event.nativeEvent.key;
            if (key === ' ' && localPlayer.canPlaceBomb) {
                this.placeBomb(localPlayer);
                localPlayer.canPlaceBomb = false;
            }
        });

        eventManager.addEventListener(document.body, 'keyup', (event) => {
            const key = event.nativeEvent.key;
            if (key === ' ') {
                localPlayer.canPlaceBomb = true;
            }
        });
    }

    reconcileLocalPlayer(data) {
        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;

        // If player is actively moving, don't reconcile. Let them move freely on their screen.
        // The server will have the authoritative position, and we'll snap when they stop.
        if (localPlayer.movement) {
            return;
        }

        const serverGridX = data.x;
        const serverGridY = data.y;
        
        this.pendingMoves = this.pendingMoves.filter(move => move.sequenceNumber > data.sequenceNumber);

        const serverX = serverGridX * this.game.map.level.block_size + 15;
        const serverY = serverGridY * this.game.map.level.block_size;
        
        const error = Math.sqrt(Math.pow(localPlayer.x - serverX, 2) + Math.pow(localPlayer.y - serverY, 2));

        // When the player stops, if they are too far from the server's position, snap them back.
        if (error > 5) { // Using a small threshold
            localPlayer.x = serverX;
            localPlayer.y = serverY;
        }
    }

    update(timestamp) {
        console.log("kayan l update");
        
        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer || localPlayer.dying || this.game.state.isPaused()) {
            if (this.game.state.isPaused()) {
                this.players.forEach(p => p.movement = false);
            }
            return;
        }

        this.movePlayer(localPlayer, timestamp);
        this.render(localPlayer);
        
        if (localPlayer.movement && timestamp - this.lastServerUpdateTime > this.serverUpdateInterval) {
            const sequenceNumber = ++this.sequenceNumber;
            let direction = 'STOP'; 
            if (localPlayer.direction.includes('Up')) direction = 'UP';
            else if (localPlayer.direction.includes('Down')) direction = 'DOWN';
            else if (localPlayer.direction.includes('Left')) direction = 'LEFT';
            else if (localPlayer.direction.includes('Right')) direction = 'RIGHT';

            if (direction !== 'STOP') {
                    this.networkManager.sendPlayerMove(direction, sequenceNumber);
                    this.pendingMoves.push({ direction, sequenceNumber, x: localPlayer.x, y: localPlayer.y });
            }
            this.lastServerUpdateTime = timestamp;
        }
    }

    movePlayer(player, timestamp) {
        if (player.dying) return;

        let previousDirection = player.direction;
        let moved = false;
        
        if (this.game.state.isArrowUp()) {
            moved = this.up(player) || moved;
        }
        if (this.game.state.isArrowDown()) {
            moved = this.down(player) || moved;
        }
        if (this.game.state.isArrowRight()) {
            moved = this.right(player) || moved;
        }
        if (this.game.state.isArrowLeft()) {
            moved = this.left(player) || moved;
        }

        player.movement = moved;

        if (!player.movement && player.direction.includes("walking")) {
            player.direction = player.direction.replace("walking", '');
            player.animate = true;
            player.frameIndex = 0;
        }
        
        if (player.direction !== previousDirection) {
            player.frameIndex = 0;
        }

        const delta = timestamp - player.lastTime;
        if ((delta >= player.MS_PER_FRAME) && player.movement) {
            player.lastTime = timestamp;
            player.animate = true;
            this.updatePlayerSprite(player);
        }
    }

    up(player) {
        const { width, height } = this.getPlayerDimensions(player);
        if (this.canMoveTo(player.x, player.y - player.speed, width, height)) {
            player.direction = 'walkingUp';
            player.y -= player.speed;
            return true;
        }
        return false;
    }

    down(player) {
        const { width, height } = this.getPlayerDimensions(player);
        if (this.canMoveTo(player.x, player.y + player.speed, width, height)) {
            player.direction = 'walkingDown';
            player.y += player.speed;
            return true;
        }
        return false;
    }

    left(player) {
        const { width, height } = this.getPlayerDimensions(player);
        if (this.canMoveTo(player.x - player.speed, player.y, width, height)) {
            player.direction = 'walkingLeft';
            player.x -= player.speed;
            return true;
        }
        return false;
    }

    right(player) {
        const { width, height } = this.getPlayerDimensions(player);
        if (this.canMoveTo(player.x + player.speed, player.y, width, height)) {
            player.direction = 'walkingRight';
            player.x += player.speed;
            return true;
        }
        return false;
    }
    
    render(player) {
        if (!player.element) return;
        
        if (player.animate) {
             const frame = this.playerCoordinate[player.direction][player.frameIndex];
             if (frame) {
                player.element.style.backgroundPosition = `${frame.x}px ${frame.y}px`;
                player.element.style.width = `${frame.width}px`;
                player.element.style.height = `${frame.height}px`;
             }
             player.animate = false;
        }
        player.element.style.transform = `translate(${player.x}px, ${player.y}px)`;

        const {width, height} = this.getPlayerDimensions(player);
        player.gridX = Math.floor((player.x + (width / 2)) / this.game.map.level.block_size);
        player.gridY = Math.floor((player.y + (height / 2)) / this.game.map.level.block_size);
    }

    getPlayerDimensions(player) {
        if (!this.playerCoordinate || !this.playerCoordinate[player.direction]) return { width: 0, height: 0 };
        const frame = this.playerCoordinate[player.direction][player.frameIndex];
        return { width: frame.width, height: frame.height };
    }

    updatePlayerSprite(player) {
        if (!player.element || !this.playerCoordinate) return;
        
        const directionFrames = this.playerCoordinate[player.direction];
        if (!directionFrames) return;

        // Animate frame for walking
        if (player.movement) {
            player.frameIndex = (player.frameIndex + 1) % directionFrames.length;
        }
        const frame = directionFrames[player.frameIndex];
        if (!frame) return;

        player.element.style.width = `${frame.width}px`;
        player.element.style.height = `${frame.height}px`;
        player.element.style.backgroundPosition = `${frame.x}px ${frame.y}px`;
    }

    canMoveTo(x, y, width, height) {
        const blockSize = this.game.map.level.block_size;
        // console.log(`canMoveTo called with x: ${x}, y: ${y}, w: ${width}, h: ${height}, speed: ${this.players.get(this.localPlayerId).speed}`);
        const corners = [
            [x, y],
            [x + width, y],
            [x, y + height],
            [x + width, y + height]
        ];
        
        const gridHeight = this.game.map.gridArray.length;
        const gridWidth = this.game.map.gridArray[0].length;

        for (const [i, [cx, cy]] of corners.entries()) {
            const gridX = Math.floor(cx / blockSize);
            const gridY = Math.floor(cy / blockSize);
            
            // console.log(`Checking corner ${i}: cx=${cx}, cy=${cy} -> gridX=${gridX}, gridY=${gridY}`);

            if (gridX < 0 || gridX >= gridWidth || gridY < 0 || gridY >= gridHeight) {
                // console.log('Out of bounds');
                return false;
            }

            const cell = this.game.map.gridArray[gridY][gridX];
            // console.log(`Cell content: ${cell}`);
            if (cell === consts.WALL || cell === consts.SOFT_BLOCK) {
                // console.log('Collision with wall or block');
                return false;
            }
        }

        if (this.game.bombManager) {
            for (const bomb of this.game.bombManager.bombs.values()) {
                 const bombX = bomb.gridX * blockSize;
                 const bombY = bomb.gridY * blockSize;
                if (
                    x < bombX + blockSize &&
                    x + width > bombX &&
                    y < bombY + blockSize &&
                    y + height > bombY
                ) {
                    // console.log('Collision with bomb');
                    return false;
                }
            }
        }
        
        // console.log('canMoveTo returning true');
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

    // In MultiplayerPlayerManager.js - updateRemotePlayer method (around line 290)
    updateRemotePlayer(data) {
        const player = this.players.get(data.playerId);
        if (!player || player.isLocal) return;

        player.x = data.x;
        player.y = data.y;
        player.gridX = Math.floor(data.x / this.game.map.level.block_size);
        player.gridY = Math.floor(data.y / this.game.map.level.block_size);

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