import * as consts from '../utils/consts.js';
import * as helpers from '../utils/helpers.js';
import { dom, eventEmitter, createSignal, createEffect, createMemo } from '../framwork/index.js';


export class Player {

    constructor(game) {
        this.game = game
        
        // Reactive player state
        this.position = createSignal({ x: 0, y: 0 });
        this.direction = createSignal('Down');
        this.isMoving = createSignal(false);
        this.isDying = createSignal(false);
        this.canBomb = createSignal(true);
        this.health = createSignal(3);
        
        // Computed values
        this.isAlive = createMemo(() => !this.isDying[0]() && this.health[0]() > 0);
        this.currentSpeed = createMemo(() => this.game.state.getPlayerSpeed());
        
        // Effects for reactive updates
        createEffect(() => {
            if (this.isDying[0]()) {
                eventEmitter.emit('playerDied', { playerId: this.playerId || 'player1' });
            }
        });
        
        createEffect(() => {
            const pos = this.position[0]();
            if (this.isMoving[0]()) {
                eventEmitter.emit('playerMoved', { x: pos.x, y: pos.y, direction: this.direction[0]() });
            }
        });
    }

    static getInstance = (game) => Player.instance ? Player.instance : new Player(game)

    async initPlayer() {
        this.playerCoordinate = await fetch(`assets/playerCoordinate.json`).then(res => res.json())
        if (this.player) this.game.map.grid.removeChild(this.player)
        this.player = dom({
            tag: 'div',
            attributes: { class: 'player' }
        })
        this.dyingSound = new Audio(this.game.map.level.dying_sound);
        this.player.appendChild(this.dyingSound)
        this.game.map.grid.appendChild(this.player)
        await this.initClassData()
        this.canPutBomb = true
        this.keydownHandler = (event) => {
            if (event.key === ' ') {
                this.putBomb = true
                eventEmitter.emit('playerAction', { action: 'bombRequest', player: this });
            }
        }
        this.keyupHandler = (event) => event.key === ' ' ? this.canPutBomb = true : 0
        document.addEventListener('keydown', this.keydownHandler)
        document.addEventListener('keyup', this.keyupHandler)
        
        eventEmitter.on('playerDamaged', this.handleDamage.bind(this));
    }

    async initClassData() {
        this.movement = false
        this.dying = false
        this.reRender = false
        this.renderExp = false
        this.exp = null
        this.frameIndex = 0
        this.explosionFrameIndex = 0
        this.lastTime = performance.now()
        this.MS_PER_FRAME = 100
        const tmp = helpers.getCoordinates(this.game.map.level.initial_grid, consts.PLAYER)
        this.y = tmp[0] * this.game.map.level.block_size
        this.x = tmp[1] * this.game.map.level.block_size + 15
        
        // Update reactive state
        this.position[1]({ x: this.x, y: this.y });
        this.direction[1]('Down');
        this.isDying[1](false);
        
        this.game.map.gridArray[tmp[0]][tmp[1]] = consts.FLOOR
        this.player.style.backgroundImage = `url(${this.game.map.level.player})`;
        this.player.style.backgroundRepeat = 'no-repeat';
        this.player.style.imageRendering = 'pixelated';
        this.player.style.position = 'absolute';
        this.player.style.transform = `translate(${this.x}px, ${this.y}px)`;
        this.frame = this.playerCoordinate[this.direction[0]()][this.frameIndex];
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
            this.exp = dom({ tag: 'img' })
            this.game.map.grid.appendChild(this.exp)
            this.exp.style.position = "absolute";
            this.exp.style.transform = `translate(${(this.x - 20)}px, ${this.y}px)`;
            const expSize = 64;
            this.exp.style.width = `${expSize}px`;
            this.exp.style.height = `${expSize}px`;
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

    handleDamage(data) {
        if (data.playerId === this.playerId) {
            this.kill();
        }
    }

    async movePlayer(timestamp) {
        if (this.dying) return
        const oldX = this.x, oldY = this.y;
        this.up()
        this.down()
        this.right()
        this.left()

        if (this.putBomb && this.canPutBomb) {
            this.game.map.addBomb(this.x + (this.getPlayerWidth() / 2), this.y + (this.getPlayerHeight() / 2), timestamp)
            this.putBomb = false
            this.canPutBomb = false
        }

        if (oldX !== this.x || oldY !== this.y) {
            eventEmitter.emit('playerMoved', { x: this.x, y: this.y, direction: this.direction });
        }

        if (!this.movement && this.direction[0]().includes("walking")) {
            this.direction[1](this.direction[0]().replace("walking", ''));
            this.animate = true
            this.frameIndex = 0
            this.frame = this.playerCoordinate[this.direction[0]()][this.frameIndex];
            return
        }

        const delta = timestamp - this.lastTime;
        if ((delta >= this.MS_PER_FRAME) && this.movement) {
            this.frame = this.playerCoordinate[this.direction[0]()][this.frameIndex];
            this.lastTime = timestamp;
            this.animate = true
            this.frameIndex = (this.frameIndex + 1) % this.playerCoordinate[this.direction[0]()].length;
        }
    }

    async up() {
        if (this.game.state.isArrowUp() || this.Up) {
            this.Up = false
            if (this.game.map.canPlayerMoveTo(this.x, this.y - this.game.state.getPlayerSpeed())) {
                this.direction[1]('walkingUp');
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
                this.direction[1]('walkingDown');
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
                this.direction[1]('walkingLeft');
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
                this.direction[1]('walkingRight');
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


    kill = () => {
        this.dying = true;
        this.isDying[1](true);
        this.health[1](prev => prev - 1);
    }
    getPlayerHeight = () => this.playerCoordinate[this.direction[0]()][this.frameIndex].height
    getPlayerWidth = () => this.playerCoordinate[this.direction[0]()][this.frameIndex].width
    removeplayer = () => {
        if (this.keydownHandler) document.removeEventListener('keydown', this.keydownHandler)
        if (this.keyupHandler) document.removeEventListener('keyup', this.keyupHandler)
        eventEmitter.off('playerDamaged', this.handleDamage);
        this.player.remove()
    }
}