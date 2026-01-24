import { dom } from '../../framework/index.js';
import * as consts from '../utils/consts.js';

export class MultiplayerPlayer {
    constructor(playerData, isLocal, playerImage) {
        this.playerId = playerData.playerId;
        this.nickname = playerData.nickname;
        this.x = playerData.x;
        this.y = playerData.y;
        this.gridX = playerData.gridX;
        this.gridY = playerData.gridY;
        this.lives = playerData.lives;
        this.speed = playerData.speed;
        this.bombCount = playerData.bombCount;
        this.bombRange = playerData.bombRange;
        this.alive = true;
        this.isLocal = isLocal;
        this.playerImage = playerImage;
        this.direction = 'Down';
        this.frameIndex = 0;
        this.movement = false;
        this.lastTime = performance.now();
        this.MS_PER_FRAME = 100;
        this.canPlaceBomb = true;
        this.element = null;
        this.playerCoordinate = null;
        this.animate = false;
        this.frame = null;
        
        // Client-side prediction for local player
        if (this.isLocal) {
            this.sequenceNumber = 0;
            this.pendingMoves = [];
        }
    }

    async init() {
        this.playerCoordinate = await fetch('/game/assets/playerCoordinate.json').then(res => res.json());
        this.createPlayerElement();
    }

    createPlayerElement() {
        this.frame = this.playerCoordinate[this.direction][this.frameIndex];
        const playerClass = this.isLocal ? 'local-player' : 'remote-player';

        this.element = dom({
            tag: 'div',
            attributes: {
                class: playerClass,
                id: `player-${this.playerId}`,
                style: `position: absolute; 
                        width: ${this.frame.width}px;
                        height: ${this.frame.height}px;
                        background: url('${this.playerImage}') no-repeat;
                        image-rendering: pixelated;
                        transform: translate(${this.x}px, ${this.y}px);
                        z-index: 10;`
            },
            children: []
        });
        this.element.style.backgroundPosition = `${this.frame.x} ${this.frame.y}`;

        const gridElement = document.getElementById('grid');
        if (gridElement) {
            gridElement.appendChild(this.element);
        }
    }

    updateRender(timestamp, game, gameState) {
        if (this.isLocal) {
            this.handleLocalPlayerUpdate(timestamp, game, gameState);
        } else {
            this.handleRemotePlayerAnimation(timestamp);
        }
        this.render();
    }
    
    handleLocalPlayerUpdate(timestamp, game, gameState) {
        this.movePlayer(timestamp, game, gameState);
    }
    
    handleRemotePlayerAnimation(timestamp) {
        if (this.movement) {
            const delta = timestamp - this.lastTime;
            if (delta >= this.MS_PER_FRAME) {
                this.lastTime = timestamp;
                this.frame = this.playerCoordinate[this.direction]?.[this.frameIndex];
                this.frameIndex = (this.frameIndex + 1) % this.playerCoordinate[this.direction]?.length;
                this.animate = true;
            }
        } else {
            this.frameIndex = 0;
            this.frame = this.playerCoordinate[this.direction]?.[this.frameIndex];
            this.animate = true;
        }
    }
    
    movePlayer(timestamp, game, gameState) {
        if (!this.alive || this.dying) return;

        this.movement = false;
        this.up(game, gameState);
        this.down(game, gameState);
        this.right(game, gameState);
        this.left(game, gameState);

        if (!this.movement && this.direction.includes("walking")) {
            this.direction = this.direction.replace("walking", '');
            this.animate = true;
            this.frameIndex = 0;
            this.frame = this.playerCoordinate[this.direction][this.frameIndex];
            return;
        }

        const delta = timestamp - this.lastTime;
        if ((delta >= this.MS_PER_FRAME) && this.movement) {
            this.frame = this.playerCoordinate[this.direction][this.frameIndex];
            this.lastTime = timestamp;
            this.frameIndex = (this.frameIndex + 1) % this.playerCoordinate[this.direction].length;
            this.animate = true;
        }
    }

    render() {
        if (!this.element || !this.frame) return;

        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;

        if (this.animate) {
            const fx = parseFloat(this.frame.x);
            const fy = parseFloat(this.frame.y);
            this.element.style.width = `${this.frame.width}px`;
            this.element.style.height = `${this.frame.height}px`;
            this.element.style.backgroundPosition = `${fx}px ${fy}px`;
            this.animate = false;
        }
    }

    updateStateFromServer(serverData) {
        const oldX = this.x;
        const oldY = this.y;
    
        this.x = serverData.x;
        this.y = serverData.y;
        this.gridX = serverData.gridX;
        this.gridY = serverData.gridY;
        this.lives = serverData.lives;
        this.speed = serverData.speed;
        this.bombCount = serverData.bombCount;
        this.bombRange = serverData.bombRange;
        this.alive = serverData.alive;
        
        const dx = this.x - oldX;
        const dy = this.y - oldY;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0.01) this.direction = 'walkingRight';
            else if (dx < -0.01) this.direction = 'walkingLeft';
        } else if (Math.abs(dy) > 0.01) {
            if (dy > 0.01) this.direction = 'walkingDown';
            else if (dy < -0.01) this.direction = 'walkingUp';
        }

        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01) {
            this.movement = true;
        } else {
            this.movement = false;
            if (this.direction.includes("walking")) {
                this.direction = this.direction.replace("walking", '');
            }
            this.animate = true;
        }
    }
    
    reconcileWithServer(serverData, networkManager) {
        if (!this.isLocal) return;
        
        // Remove acknowledged moves
        this.pendingMoves = this.pendingMoves.filter(m => m.sequenceNumber > serverData.sequenceNumber);
        
        // Server sends pixel coordinates directly
        const serverX = serverData.x;
        const serverY = serverData.y;
        const error = Math.sqrt(Math.pow(this.x - serverX, 2) + Math.pow(this.y - serverY, 2));
        
        // If error is significant, correct position
        if (error > 5) {
            this.x = serverX;
            this.y = serverY;
            this.gridX = serverData.gridX;
            this.gridY = serverData.gridY;
        }
        
        // Update stats from server
        this.lives = serverData.lives || this.lives;
        this.speed = serverData.speed || this.speed;
        this.bombCount = serverData.bombCount || this.bombCount;
        this.bombRange = serverData.bombRange || this.bombRange;
        this.alive = serverData.alive !== undefined ? serverData.alive : this.alive;
    }
    
    predictMove(direction, game) {
        if (!this.isLocal) return null;
        
        const oldX = this.x;
        const oldY = this.y;
        
        // Apply movement prediction
        switch(direction) {
            case 'UP':
                if (this.canPlayerMoveTo(game, this.x, this.y - this.speed)) {
                    this.y -= this.speed;
                    this.direction = 'walkingUp';
                    this.movement = true;
                }
                break;
            case 'DOWN':
                if (this.canPlayerMoveTo(game, this.x, this.y + this.speed)) {
                    this.y += this.speed;
                    this.direction = 'walkingDown';
                    this.movement = true;
                }
                break;
            case 'LEFT':
                if (this.canPlayerMoveTo(game, this.x - this.speed, this.y)) {
                    this.x -= this.speed;
                    this.direction = 'walkingLeft';
                    this.movement = true;
                }
                break;
            case 'RIGHT':
                if (this.canPlayerMoveTo(game, this.x + this.speed, this.y)) {
                    this.x += this.speed;
                    this.direction = 'walkingRight';
                    this.movement = true;
                }
                break;
        }
        
        // If movement occurred, track it
        if (oldX !== this.x || oldY !== this.y) {
            const move = {
                sequenceNumber: ++this.sequenceNumber,
                direction,
                x: this.x,
                y: this.y
            };
            this.pendingMoves.push(move);
            return move;
        }
        
        return null;
    }

    up(game, gameState) {
        if (gameState.isArrowUp() || this.Up) {
            this.Up = false;
            if (this.canPlayerMoveTo(game, this.x, this.y - this.speed)) {
                this.direction = 'walkingUp';
                if (!this.canPlayerMoveTo(game, this.x, this.y) || !this.canPlayerMoveTo(game, this.x, this.y - this.speed)) this.x -= 7;
                this.y -= this.speed;
                this.movement = true;
            } else {
                const frameWidth = this.getPlayerDimensions().width;
                const blockSize = game.map.level.block_size;
                let xMap = Math.floor((this.x - 10) / blockSize);
                let yMap = Math.floor(this.y / blockSize);
                if (this.isFreeSpaceInGrid(game, xMap, yMap - 1) && !gameState.isArrowRight()) { this.Left = true; return; }
                xMap = Math.floor((this.x + frameWidth + 10) / blockSize);
                if (this.isFreeSpaceInGrid(game, xMap, yMap - 1) && !gameState.isArrowLeft()) { this.Right = true; return; }
            }
        }
    }

    down(game, gameState) {
        if (gameState.isArrowDown() || this.Down) {
            this.Down = false;
            if (this.canPlayerMoveTo(game, this.x, this.y + this.speed)) {
                this.direction = 'walkingDown';
                if (!this.canPlayerMoveTo(game, this.x, this.y) || !this.canPlayerMoveTo(game, this.x, this.y + this.speed)) this.x -= 7;
                this.y += this.speed;
                this.movement = true;
            } else {
                const {width, height} = this.getPlayerDimensions();
                const blockSize = game.map.level.block_size;
                let xMap = Math.floor((this.x - 10) / blockSize);
                let yMap = Math.floor((this.y + height) / blockSize);
                if (this.isFreeSpaceInGrid(game, xMap, yMap + 1) && !gameState.isArrowRight()) { this.Left = true; return; }
                xMap = Math.floor((this.x + width + 10) / blockSize);
                if (this.isFreeSpaceInGrid(game, xMap, yMap + 1) && !gameState.isArrowLeft()) { this.Right = true; return; }
            }
        }
    }

    left(game, gameState) {
        if (gameState.isArrowLeft() || this.Left) {
            this.Left = false;
            if (this.canPlayerMoveTo(game, this.x - this.speed, this.y)) {
                this.direction = 'walkingLeft';
                this.x -= this.speed;
                this.movement = true;
            } else {
                const {height} = this.getPlayerDimensions();
                const blockSize = game.map.level.block_size;
                let xMap = Math.floor(this.x / blockSize);
                let yMap = Math.floor(this.y / blockSize);
                if (this.isFreeSpaceInGrid(game, xMap - 1, yMap) && !gameState.isArrowDown()) { this.Up = true; return; }
                yMap = Math.floor((this.y + height) / blockSize);
                if (this.isFreeSpaceInGrid(game, xMap - 1, yMap) && !gameState.isArrowUp()) { this.Down = true; return; }
            }
        }
    }

    right(game, gameState) {
        if (gameState.isArrowRight() || this.Right) {
            this.Right = false;
            if (this.canPlayerMoveTo(game, this.x + this.speed, this.y)) {
                this.direction = 'walkingRight';
                this.x += this.speed;
                this.movement = true;
            } else {
                const {width, height} = this.getPlayerDimensions();
                const blockSize = game.map.level.block_size;
                let xMap = Math.floor((this.x + width) / blockSize);
                let yMap = Math.floor(this.y / blockSize);
                if (this.isFreeSpaceInGrid(game, xMap + 1, yMap) && !gameState.isArrowDown()) { this.Up = true; return; }
                yMap = Math.floor((this.y + height) / blockSize);
                if (this.isFreeSpaceInGrid(game, xMap + 1, yMap) && !gameState.isArrowUp()) { this.Down = true; return; }
            }
        }
    }

    canPlayerMoveTo(game, x, y) {
        const blockSize = game.map.level.block_size;
        const { width, height } = this.getPlayerDimensions();
        const corners = [
            [x, y],
            [x + width, y],
            [x, y + height],
            [x + width, y + height]
        ];
        for (const [cx, cy] of corners) {
            const gridX = Math.floor(cx / blockSize);
            const gridY = Math.floor(cy / blockSize);
            if (!this.isFreeSpaceInGrid(game, gridX, gridY)) return false
        }
        return true;
    }

    isFreeSpaceInGrid(game, x, y) {
        const grid = game.map.level.initial_grid;
        if (!grid || !grid[y] || grid[y][x] === undefined) {
            return false;
        }
        const cell = grid[y][x];
        return cell !== consts.WALL && cell !== consts.BLOCK;
    }
    
    getPlayerDimensions() {
        if (!this.playerCoordinate || !this.frame) return { width: 30, height: 40 }; // fallback
        return { width: this.frame.width ?? 30, height: this.frame.height ?? 40 };
    }

    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}