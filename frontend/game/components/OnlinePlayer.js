import { dom } from '../../framework/index.js';
import * as consts from '../utils/consts.js';
import { PlayerState } from '../engine/PlayerState.js';
import { NetworkManager } from '../network/NetworkManager.js';

export class OnlinePlayer {
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
        this.networkManager = NetworkManager.getInstance();

        // Each player has its own state
        this.state = new PlayerState(isLocal);

        // Client-side prediction for local player
        if (this.isLocal) {
            this.state.onMovementStopped = () => {
                this.sequenceNumber = (this.sequenceNumber || 0) + 1;
                this.networkManager.sendPlayerStop(this.sequenceNumber)
            }
            this.pendingMoves = [];
        }
    }

    async init() {
        this.playerCoordinate = await fetch('/game/assets/playerCoordinate.json').then(res => res.json());
        this.createPlayerElement();
        this.state.initListeners();
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

    updateRender(timestamp, game) {
        if (this.isLocal) {
            this.movePlayer(timestamp, game);
        } else {
            this.handleRemotePlayerAnimation(timestamp);
        }
        this.render();
    }

    handleRemotePlayerAnimation(timestamp) {
        console.log('REMOTE - direction:', this.direction, 'frameIndex:', this.frameIndex);
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

    movePlayer(timestamp, game) {
        console.log('LOCAL - direction:', this.direction, 'frameIndex:', this.frameIndex);
        if (!this.alive || this.dying) return;

        this.movement = false;
        this.up(game);
        this.down(game);
        this.right(game);
        this.left(game);

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

        this.direction = "walking" + serverData.direction.charAt(0) + serverData.direction.slice(1).toLowerCase();

        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            this.movement = true;
            // Update remote player state to simulate movement
            if (!this.isLocal) {
                this.state.setDirection(this.direction);
            }
        } else {
            this.movement = false;
            if (this.direction.includes("walking")) {
                this.direction = this.direction.replace("walking", '');
            }
            if (!this.isLocal) {
                this.state.clearDirection();
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
        switch (direction) {
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

    up(game) {
        if (this.state.isArrowUp() || this.Up) {
            this.Up = false;
            let width = this.getPlayerWidth();
            let height = this.getPlayerHeight();

            if (game.map.canPlayerMoveTo(this.x, this.y - this.speed, width, height)) {
                this.direction = 'walkingUp';
                width = this.getPlayerWidth();
                height = this.getPlayerHeight();
                if (!game.map.canPlayerMoveTo(this.x, this.y, width, height) || !game.map.canPlayerMoveTo(this.x, this.y - this.speed, width, height)) this.x -= 7;
                this.y -= this.speed;
                this.movement = true;
                if (this.isLocal) {
                    this.sequenceNumber++
                    this.networkManager.sendPlayerMove("UP", this.sequenceNumber);
                }
            } else {
                const frameWidth = this.getPlayerWidth();
                const blockSize = game.map.level.block_size;
                let xMap = Math.floor((this.x - 10) / blockSize);
                let yMap = Math.floor(this.y / blockSize);
                if (game.map.isFreeSpaceInGrid(xMap, yMap - 1) && !this.state.isArrowRight()) { this.Left = true; return; }
                xMap = Math.floor((this.x + frameWidth + 10) / blockSize);
                if (game.map.isFreeSpaceInGrid(xMap, yMap - 1) && !this.state.isArrowLeft()) { this.Right = true; return; }
            }
        }
    }

    down(game) {
        if (this.state.isArrowDown() || this.Down) {
            this.Down = false;
            let width = this.getPlayerWidth();
            let height = this.getPlayerHeight();

            if (game.map.canPlayerMoveTo(this.x, this.y + this.speed, width, height)) {
                this.direction = 'walkingDown';
                width = this.getPlayerWidth();
                height = this.getPlayerHeight();
                if (!game.map.canPlayerMoveTo(this.x, this.y, width, height) || !game.map.canPlayerMoveTo(this.x, this.y + this.speed, width, height)) {
                    this.x -= 7
                }
                this.y += this.speed;
                this.movement = true;
                if (this.isLocal) {
                    this.sequenceNumber++
                    this.networkManager.sendPlayerMove("DOWN", this.sequenceNumber);
                }
            } else {
                const width = this.getPlayerWidth();
                const height = this.getPlayerHeight();
                const blockSize = game.map.level.block_size;
                let xMap = Math.floor((this.x - 10) / blockSize);
                let yMap = Math.floor((this.y + height) / blockSize);
                if (game.map.isFreeSpaceInGrid(xMap, yMap + 1) && !this.state.isArrowRight()) { this.Left = true; return; }
                xMap = Math.floor((this.x + width + 10) / blockSize);
                if (game.map.isFreeSpaceInGrid(xMap, yMap + 1) && !this.state.isArrowLeft()) { this.Right = true; return; }
            }
        }
    }

    left(game) {
        if (this.state.isArrowLeft() || this.Left) {
            this.Left = false;
            const width = this.getPlayerWidth();
            const height = this.getPlayerHeight();
            if (game.map.canPlayerMoveTo(this.x - this.speed, this.y, width, height)) {
                this.direction = 'walkingLeft';
                this.x -= this.speed;
                this.movement = true;
                if (this.isLocal) {
                    this.sequenceNumber++
                    this.networkManager.sendPlayerMove("LEFT", this.sequenceNumber);
                }
            } else {
                const height = this.getPlayerHeight();
                const blockSize = game.map.level.block_size;
                let xMap = Math.floor(this.x / blockSize);
                let yMap = Math.floor(this.y / blockSize);
                if (game.map.isFreeSpaceInGrid(xMap - 1, yMap) && !this.state.isArrowDown()) { this.Up = true; return; }
                yMap = Math.floor((this.y + height) / blockSize);
                if (game.map.isFreeSpaceInGrid(xMap - 1, yMap) && !this.state.isArrowUp()) { this.Down = true; return; }
            }
        }
    }

    right(game) {
        if (this.state.isArrowRight() || this.Right) {
            this.Right = false;
            const width = this.getPlayerWidth();
            const height = this.getPlayerHeight();
            if (game.map.canPlayerMoveTo(this.x + this.speed, this.y, width, height)) {
                this.direction = 'walkingRight';
                this.x += this.speed;
                this.movement = true;
                if (this.isLocal) {
                    this.sequenceNumber++
                    this.networkManager.sendPlayerMove("RIGHT", this.sequenceNumber);
                }
            } else {
                const width = this.getPlayerWidth();
                const height = this.getPlayerHeight();
                const blockSize = game.map.level.block_size;
                let xMap = Math.floor((this.x + width) / blockSize);
                let yMap = Math.floor(this.y / blockSize);
                if (game.map.isFreeSpaceInGrid(xMap + 1, yMap) && !this.state.isArrowDown()) { this.Up = true; return; }
                yMap = Math.floor((this.y + height) / blockSize);
                if (game.map.isFreeSpaceInGrid(xMap + 1, yMap) && !this.state.isArrowUp()) { this.Down = true; return; }
            }
        }
    }

    getPlayerHeight = () => this.playerCoordinate[this.direction][this.frameIndex]?.height ?? 40
    getPlayerWidth = () => this.playerCoordinate[this.direction][this.frameIndex]?.width ?? 30

    remove() {
        this.state.removeListeners();
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}