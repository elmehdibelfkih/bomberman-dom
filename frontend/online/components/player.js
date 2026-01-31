import * as consts from '../utils/consts.js';
import * as helpers from '../utils/helpers.js';
import { dom, eventManager } from '../../framework/framework/index.js';


export class Player {

    constructor(game) {
        this.game = game;
        this.is_local = false;
        this.state = {
            id: null,
            nickname: null,
            x: 0,
            y: 0,
            direction: 'Down',
            speed: 4,
            movement: false,
            dying: false,
            isDead: false,
            bombCount: 0,
            maxBombs: 3,
            bombRange: 1
        };
    }

    async initPlayer(playerData, isLocal) {
        this.is_local = isLocal;

        this.state.id = playerData.playerId;
        this.state.nickname = playerData.nickname;
        this.state.x = playerData.x;
        this.state.y = playerData.y;
        this.state.speed = playerData.speed;
        this.state.bombCount = playerData.bombCount;
        this.state.bombRange = playerData.bombRange;
        this.state.isDead = !playerData.alive;
        this.state.dying = !playerData.alive;

        this.playerCoordinate = await fetch(`../assets/playerCoordinate.json`).then(res => res.json())
        if (this.player) this.game.grid.removeChild(this.player)
        this.dyingSound = new Audio(this.game.map.level.dying_sound);
        this.player = dom({
            tag: 'div',
            attributes: {
                class: 'player'
            }
        });
        if (this.is_local) {
            this.player.classList.add('local-player');
        }
        this.player.appendChild(this.dyingSound);
        this.game.map.grid.appendChild(this.player)
        await this.initClassData()

        if (this.is_local) {
            this.canPutBomb = true
            // register on document.documentElement so GlobalEventManager will reach these handlers
            eventManager.linkNodeToHandlers(document.documentElement, 'keydown', (e) => e.nativeEvent.key === ' ' ? this.putBomb = true : 0)
            eventManager.linkNodeToHandlers(document.documentElement, 'keyup', (e) => e.nativeEvent.key === ' ' ? this.canPutBomb = true : 0)
        }
    }

    async initClassData() {
        this.state.movement = false
        this.reRender = false
        this.renderExp = false
        this.exp = null
        this.frameIndex = 0
        this.explosionFrameIndex = 0
        this.state.direction = 'Down'
        this.lastTime = performance.now()
        this.MS_PER_FRAME = 100
        
        this.player.style.backgroundImage = `url(${this.game.map.level.player})`;
        this.player.style.backgroundRepeat = 'no-repeat';
        this.player.style.imageRendering = 'pixelated';
        this.player.style.position = 'absolute';
        this.player.style.transform = `translate(${this.state.x}px, ${this.state.y}px)`;
        this.frame = this.playerCoordinate[this.state.direction][this.frameIndex];
        this.player.style.width = `${this.frame.width}px`;
        this.player.style.height = `${this.frame.height}px`;
        this.player.style.backgroundPosition = `${this.frame.x} ${this.frame.y}`;
        this.player.style.opacity = 1;
    }

    async updateRender(timestamp) {
        this.playerDying(timestamp)
        this.movePlayer(timestamp)
        this.checkLoot()
        this.render()
    }

    async playerDying(timestamp) {
        if (!this.dying) return
        if (!this.lastTimeDying) {
            this.dyingSound.play().catch(err => {
                console.error("Playback failed:", err);
            });
            this.lastTimeDying = timestamp
            const expSize = 64;
            this.exp = dom({
                tag: 'img',
                attributes: {
                    style: `
                        position: absolute;
                        transform: translate(${(this.x - 20)}px, ${this.y}px);
                        width: ${expSize}px;
                        height: ${expSize}px;
                    `
                }
            })
            this.game.map.grid.appendChild(this.exp)
            this.explosionFrameIndex = 0
            this.explosionImg = this.game.map.level.player_explosion_img
            this.renderExp = true
        }
        const delta = timestamp - this.lastTimeDying;

        if (delta >= 40) {
            this.explosionImg = this.explosionImg.replace(/\d+.png/, `${++this.explosionFrameIndex}.png`)
            this.lastTimeDying = timestamp
            this.renderExp = true
            if (this.explosionFrameIndex === 10) {
                this.dying = false
                this.game.map.grid.removeChild(this.exp)
                this.lastTimeDying = null
                this.reRender = true
                this.game.state.setLives(-1)
                this.game.scoreboard.updateLives()
            }
        }
    }

    async movePlayer(timestamp) {
        if (this.dying) return
        this.up()
        this.down()
        this.right()
        this.left()

        if (this.putBomb && this.canPutBomb) {
            this.game.map.addBomb(this.x + (this.getPlayerWidth() / 2), this.y + (this.getPlayerHeight() / 2), timestamp)
            this.putBomb = false
            this.canPutBomb = false
        }

        if (!this.movement && this.direction.includes("walking")) {
            this.direction = this.direction.replace("walking", '')
            this.animate = true
            this.frameIndex = 0
            this.frame = this.playerCoordinate[this.direction][this.frameIndex];
            return
        }

        const delta = timestamp - this.lastTime;
        if ((delta >= this.MS_PER_FRAME) && this.movement) {
            this.frame = this.playerCoordinate[this.direction][this.frameIndex];
            this.lastTime = timestamp;
            this.animate = true
            this.frameIndex = (this.frameIndex + 1) % this.playerCoordinate[this.direction].length;
        }
    }

    async up() {
        if (this.game.state.isArrowUp() || this.Up) {
            this.Up = false
            if (this.game.map.canPlayerMoveTo(this.x, this.y - this.game.state.getPlayerSpeed())) {
                this.direction = 'walkingUp'
                if (!this.game.map.canPlayerMoveTo(this.x, this.y) || !this.game.map.canPlayerMoveTo(this.x, this.y - this.game.state.getPlayerSpeed())) this.x -= 7
                this.y -= this.game.state.getPlayerSpeed()
                this.movement = true
            } else {
                this.xMap = Math.floor((this.x - 10) / this.game.map.level.block_size)
                this.yMap = Math.floor(this.y / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap, this.yMap - 1) && !this.game.state.isArrowRight()) return this.Left = true
                this.xMap = Math.floor((this.x + this.playerCoordinate[this.direction][this.frameIndex].width + 10) / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap, this.yMap - 1) && !this.game.state.isArrowLeft()) return this.Right = true
            }
        }
    }

    async down() {
        if (this.game.state.isArrowDown() || this.Down) {
            this.Down = false
            if (this.game.map.canPlayerMoveTo(this.x, this.y + this.game.state.getPlayerSpeed())) {
                this.direction = 'walkingDown'
                if (!this.game.map.canPlayerMoveTo(this.x, this.y) || !this.game.map.canPlayerMoveTo(this.x, this.y + this.game.state.getPlayerSpeed())) this.x -= 7
                this.y += this.game.state.getPlayerSpeed()
                this.movement = true
            } else {
                this.xMap = Math.floor((this.x - 10) / this.game.map.level.block_size)
                this.yMap = Math.floor((this.y + this.playerCoordinate[this.direction][this.frameIndex].height) / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap, this.yMap + 1) && !this.game.state.isArrowRight()) return this.Left = true
                this.xMap = Math.floor((this.x + this.playerCoordinate[this.direction][this.frameIndex].width + 10) / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap, this.yMap + 1) && !this.game.state.isArrowLeft()) return this.Right = true
            }
        }
    }

    async left() {
        if (this.game.state.isArrowLeft() || this.Left) {
            this.Left = false
            if (this.game.map.canPlayerMoveTo(this.x - this.game.state.getPlayerSpeed(), this.y)) {
                this.direction = 'walkingLeft'
                this.x -= this.game.state.getPlayerSpeed()
                this.movement = true
            } else {
                this.xMap = Math.floor((this.x) / this.game.map.level.block_size)
                this.yMap = Math.floor((this.y) / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap - 1, this.yMap) && !this.game.state.isArrowDown()) return this.Up = true
                this.yMap = Math.floor((this.y + this.playerCoordinate[this.direction][this.frameIndex].height) / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap - 1, this.yMap) && !this.game.state.isArrowUp()) return this.Down = true
            }
        }
    }

    async right() {
        if (this.game.state.isArrowRight() || this.Right) {
            this.Right = false
            if (this.game.map.canPlayerMoveTo(this.x + this.game.state.getPlayerSpeed(), this.y)) {
                this.direction = 'walkingRight'
                this.x += this.game.state.getPlayerSpeed()
                this.movement = true
            } else {
                this.xMap = Math.floor((this.x + this.playerCoordinate[this.direction][this.frameIndex].width) / this.game.map.level.block_size)
                this.yMap = Math.floor((this.y) / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap + 1, this.yMap) && !this.game.state.isArrowDown()) return this.Up = true
                this.yMap = Math.floor((this.y + this.playerCoordinate[this.direction][this.frameIndex].height) / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap + 1, this.yMap) && !this.game.state.isArrowUp()) return this.Down = true
            }
        }
    }

    async render() {
        if (this.reRender) return this.initClassData()
        if (this.renderExp) {
            this.exp.src = this.explosionImg
            this.player.style.opacity = this.player.style.opacity - 0.2
            this.renderExp = false
            return
        }
        if (!this.movement && !this.animate) return
        this.player.style.transform = `translate(${this.x}px, ${this.y}px)`;
        
        if (this.animate) {
            const fx = parseFloat(this.frame.x);
            const fy = parseFloat(this.frame.y);
            this.player.style.width = `${this.frame.width}px`;
            this.player.style.height = `${this.frame.height}px`;
            this.player.style.backgroundPosition = `${fx}px ${fy}px`;
            this.animate = false;
        }
        this.movement = false
    }

    isColliding(x, y, width, height) {
        return !this.dying && !(
            this.x + this.getPlayerWidth() <= x ||
            this.x >= x + width ||
            this.y + this.getPlayerHeight() <= y ||
            this.y >= y + height
        );
    }

    async checkLoot() {
        for (const loot of this.game.map.loot) {
            const blockSize = this.game.map.level.block_size;
            if (this.isColliding(loot.x, loot.y, blockSize, blockSize)) {
                loot.removeitfromDOM()
                loot.removeitfromgrid()
                loot.makeAction()
                this.game.map.loot = this.game.map.loot.filter(b => b !== loot);
            }
        }
    }


    kill = () => this.dying = true
    getPlayerHeight = () => this.playerCoordinate[this.direction][this.frameIndex].height
    getPlayerWidth = () => this.playerCoordinate[this.direction][this.frameIndex].width
    removeplayer = () => this.player.remove()
}