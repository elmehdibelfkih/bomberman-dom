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
    }

    async init() {
        this.playerCoordinate = await fetch('/game/assets/playerCoordinate.json').then(res => res.json());
        this.createPlayerElement();
    }

    createPlayerElement() {
        const frame = this.playerCoordinate[this.direction][this.frameIndex];
        const playerClass = this.isLocal ? 'local-player' : 'remote-player';

        this.element = dom({
            tag: 'div',
            attributes: {
                class: playerClass,
                id: `player-${this.playerId}`,
                style: `position: absolute; 
                        width: ${frame.width}px;
                        height: ${frame.height}px;
                        background: url('${this.playerImage}') no-repeat;
                        background-size: auto;
                        background-position: ${frame.x} ${frame.y};
                        image-rendering: pixelated;
                        transform: translate(${this.x}px, ${this.y}px);
                        z-index: 10;`
            },
            children: []
        });

        const gridElement = document.getElementById('grid');
        if (gridElement) {
            gridElement.appendChild(this.element);
        }
    }

    update(timestamp) {
        if (this.movement) {
            const delta = timestamp - this.lastTime;
            if (delta >= this.MS_PER_FRAME) {
                this.lastTime = timestamp;
                this.frameIndex = (this.frameIndex + 1) % this.playerCoordinate[this.direction].length;
                this.animate = true;
            }
        } else {
            this.frameIndex = 0;
        }
    }

    render() {
        if (!this.element) return;

        if (this.animate) {
            const frame = this.playerCoordinate[this.direction][this.frameIndex];
            if (frame) {
                this.element.style.backgroundPosition = `${frame.x}px ${frame.y}px`;
                this.element.style.width = `${frame.width}px`;
                this.element.style.height = `${frame.height}px`;
            }
            this.animate = false;
        }
        this.element.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }

    updateState(playerData) {
        this.x = playerData.x;
        this.y = playerData.y;
        this.gridX = playerData.gridX;
        this.gridY = playerData.gridY;
        this.lives = playerData.lives;
        this.speed = playerData.speed;
        this.bombCount = playerData.bombCount;
        this.bombRange = playerData.bombRange;
        this.alive = playerData.alive;
        
        if (playerData.direction) {
            this.direction = playerData.direction;
        }
    }

    getPlayerDimensions() {
        if (!this.playerCoordinate || !this.playerCoordinate[this.direction]) return { width: 0, height: 0 };
        const frame = this.playerCoordinate[this.direction][this.frameIndex];
        return { width: frame.width, height: frame.height };
    }

    move(game, gameState) {
        if (!this.alive || this.dying) return false;

        this.movement = false;
        this.up(game, gameState);
        this.down(game, gameState);
        this.right(game, gameState);
        this.left(game, gameState);

        if (!this.movement && this.direction.includes("walking")) {
            this.direction = this.direction.replace("walking", '');
            this.animate = true;
            this.frameIndex = 0;
        }

        return this.movement;
    }

    up(game, gameState) {
        if (gameState.isArrowUp() || this.Up) {
            this.Up = false;
            if (this.canPlayerMoveTo(game, this.x, this.y - this.speed)) {
                this.direction = 'walkingUp';
                if (!this.canPlayerMoveTo(game, this.x, this.y) || !this.canPlayerMoveTo(game, this.x, this.y - this.speed)) {
                    this.x -= 7;
                }
                this.y -= this.speed;
                this.movement = true;
            } else {
                this.xMap = Math.floor((this.x - 10) / game.map.level.block_size);
                this.yMap = Math.floor(this.y / game.map.level.block_size);
                if (this.isFreeSpaceInGrid(game, this.xMap, this.yMap - 1) && !gameState.isArrowRight()) {
                    this.Left = true;
                    return;
                }
                this.xMap = Math.floor((this.x + this.getPlayerDimensions().width + 10) / game.map.level.block_size);
                if (this.isFreeSpaceInGrid(game, this.xMap, this.yMap - 1) && !gameState.isArrowLeft()) {
                    this.Right = true;
                    return;
                }
            }
        }
    }

    down(game, gameState) {
        if (gameState.isArrowDown() || this.Down) {
            this.Down = false;
            if (this.canPlayerMoveTo(game, this.x, this.y + this.speed)) {
                this.direction = 'walkingDown';
                if (!this.canPlayerMoveTo(game, this.x, this.y) || !this.canPlayerMoveTo(game, this.x, this.y + this.speed)) {
                    this.x -= 7;
                }
                this.y += this.speed;
                this.movement = true;
            } else {
                this.xMap = Math.floor((this.x - 10) / game.map.level.block_size);
                this.yMap = Math.floor((this.y + this.getPlayerDimensions().height) / game.map.level.block_size);
                if (this.isFreeSpaceInGrid(game, this.xMap, this.yMap + 1) && !gameState.isArrowRight()) {
                    this.Left = true;
                    return;
                }
                this.xMap = Math.floor((this.x + this.getPlayerDimensions().width + 10) / game.map.level.block_size);
                if (this.isFreeSpaceInGrid(game, this.xMap, this.yMap + 1) && !gameState.isArrowLeft()) {
                    this.Right = true;
                    return;
                }
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
                this.xMap = Math.floor(this.x / game.map.level.block_size);
                this.yMap = Math.floor(this.y / game.map.level.block_size);
                if (this.isFreeSpaceInGrid(game, this.xMap - 1, this.yMap) && !gameState.isArrowDown()) {
                    this.Up = true;
                    return;
                }
                this.yMap = Math.floor((this.y + this.getPlayerDimensions().height) / game.map.level.block_size);
                if (this.isFreeSpaceInGrid(game, this.xMap - 1, this.yMap) && !gameState.isArrowUp()) {
                    this.Down = true;
                    return;
                }
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
                this.xMap = Math.floor((this.x + this.getPlayerDimensions().width) / game.map.level.block_size);
                this.yMap = Math.floor(this.y / game.map.level.block_size);
                if (this.isFreeSpaceInGrid(game, this.xMap + 1, this.yMap) && !gameState.isArrowDown()) {
                    this.Up = true;
                    return;
                }
                this.yMap = Math.floor((this.y + this.getPlayerDimensions().height) / game.map.level.block_size);
                if (this.isFreeSpaceInGrid(game, this.xMap + 1, this.yMap) && !gameState.isArrowUp()) {
                    this.Down = true;
                    return;
                }
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
            if (!this.isFreeSpaceInGrid(game, gridX, gridY)) return false;
        }
        return true;
    }

    isFreeSpaceInGrid(game, x, y) {
        if (!game.map.gridArray[y] || !game.map.gridArray[y][x] === undefined) return false;
        return game.map.gridArray[y][x] !== consts.BLOCK && game.map.gridArray[y][x] !== consts.WALL;
    }

    remove() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}
