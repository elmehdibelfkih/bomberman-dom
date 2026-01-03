import * as consts from '../utils/consts.js';
import * as helpers from '../utils/helpers.js';
import { dom, eventManager, createSignal, createEffect } from '../../framwork/index.js';


export class Player {

    constructor(game) {
        this.game = game
    }

    static getInstance = (game) => Player.instance ? Player.instance : new Player(game)

    async initPlayer() {
        this.playerCoordinate = await fetch(`assets/playerCoordinate.json`).then(res => res.json())
        if (this.player) this.game.grid.removeChild(this.player)

        this.player = dom({ tag: "div", attributes: { class: 'player' }, children: [] });
        this.dyingSound = new Audio(this.game.map.level.dying_sound);
        this.player.appendChild(this.dyingSound)
        this.game.map.grid.appendChild(this.player)
        await this.initClassData()
        this.canPutBomb = true

        // Use event manager instead of direct document.addEventListener
        eventManager.addEventListener(document.body, 'keydown', (event) => {
            if (event.nativeEvent.key === ' ') this.putBomb = true;
        });

        eventManager.addEventListener(document.body, 'keyup', (event) => {
            if (event.nativeEvent.key === ' ') this.canPutBomb = true;
        });
    }

    async initClassData() {
        this.movement = false
        this.dying = false
        this.reRender = false
        this.renderExp = false
        this.exp = null
        this.frameIndex = 0
        this.explosionFrameIndex = 0
        this.direction = 'Down'
        this.lastTime = performance.now()
        this.MS_PER_FRAME = 100
        const tmp = helpers.getCoordinates(this.game.map.level.initial_grid, consts.PLAYER)
        const initialY = tmp[0] * this.game.map.level.block_size
        const initialX = tmp[1] * this.game.map.level.block_size + 15
        
        // Create reactive signals for position
        const [getX, setX] = createSignal(initialX)
        const [getY, setY] = createSignal(initialY)
        this.getX = getX
        this.setX = setX
        this.getY = getY
        this.setY = setY
        
        this.game.map.gridArray[tmp[0]][tmp[1]] = consts.FLOOR
        this.player.style.backgroundImage = `url(${this.game.map.level.player})`;
        this.player.style.backgroundRepeat = 'no-repeat';
        this.player.style.imageRendering = 'pixelated';
        this.player.style.position = 'absolute';
        
        // Create effect to update DOM when position changes
        createEffect(() => {
            const x = this.getX()
            const y = this.getY()
            this.player.style.transform = `translate(${x}px, ${y}px)`
        })
        
        this.frame = this.playerCoordinate[this.direction][this.frameIndex];
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
            const currentX = this.getX()
            const currentY = this.getY()
            this.exp = dom({
                tag: "img",
                attributes: {
                    style: `position: absolute; transform: translate(${(currentX - 20)}px, ${currentY}px); width: ${expSize}px; height: ${expSize}px;`
                },
                children: []
            });
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
            const currentX = this.getX()
            const currentY = this.getY()
            this.game.map.addBomb(currentX + (this.getPlayerWidth() / 2), currentY + (this.getPlayerHeight() / 2), timestamp)
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
            const currentX = this.getX()
            const currentY = this.getY()
            const newY = currentY - this.game.state.getPlayerSpeed()
            
            if (this.game.map.canPlayerMoveTo(currentX, newY)) {
                this.direction = 'walkingUp'
                if (!this.game.map.canPlayerMoveTo(currentX, currentY) || !this.game.map.canPlayerMoveTo(currentX, newY)) {
                    this.setX(currentX - 7)
                }
                this.setY(newY)
                this.movement = true
            } else {
                this.xMap = Math.floor((currentX - 10) / this.game.map.level.block_size)
                this.yMap = Math.floor(currentY / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap, this.yMap - 1) && !this.game.state.isArrowRight()) return this.Left = true
                this.xMap = Math.floor((currentX + this.playerCoordinate[this.direction][this.frameIndex].width + 10) / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap, this.yMap - 1) && !this.game.state.isArrowLeft()) return this.Right = true
            }
        }
    }

    async down() {
        if (this.game.state.isArrowDown() || this.Down) {
            this.Down = false
            const currentX = this.getX()
            const currentY = this.getY()
            const newY = currentY + this.game.state.getPlayerSpeed()
            
            if (this.game.map.canPlayerMoveTo(currentX, newY)) {
                this.direction = 'walkingDown'
                if (!this.game.map.canPlayerMoveTo(currentX, currentY) || !this.game.map.canPlayerMoveTo(currentX, newY)) {
                    this.setX(currentX - 7)
                }
                this.setY(newY)
                this.movement = true
            } else {
                this.xMap = Math.floor((currentX - 10) / this.game.map.level.block_size)
                this.yMap = Math.floor((currentY + this.playerCoordinate[this.direction][this.frameIndex].height) / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap, this.yMap + 1) && !this.game.state.isArrowRight()) return this.Left = true
                this.xMap = Math.floor((currentX + this.playerCoordinate[this.direction][this.frameIndex].width + 10) / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap, this.yMap + 1) && !this.game.state.isArrowLeft()) return this.Right = true
            }
        }
    }

    async left() {
        if (this.game.state.isArrowLeft() || this.Left) {
            this.Left = false
            const currentX = this.getX()
            const currentY = this.getY()
            const newX = currentX - this.game.state.getPlayerSpeed()
            
            if (this.game.map.canPlayerMoveTo(newX, currentY)) {
                this.direction = 'walkingLeft'
                this.setX(newX)
                this.movement = true
            } else {
                this.xMap = Math.floor(currentX / this.game.map.level.block_size)
                this.yMap = Math.floor(currentY / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap - 1, this.yMap) && !this.game.state.isArrowDown()) return this.Up = true
                this.yMap = Math.floor((currentY + this.playerCoordinate[this.direction][this.frameIndex].height) / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap - 1, this.yMap) && !this.game.state.isArrowUp()) return this.Down = true
            }
        }
    }

    async right() {
        if (this.game.state.isArrowRight() || this.Right) {
            this.Right = false
            const currentX = this.getX()
            const currentY = this.getY()
            const newX = currentX + this.game.state.getPlayerSpeed()
            
            if (this.game.map.canPlayerMoveTo(newX, currentY)) {
                this.direction = 'walkingRight'
                this.setX(newX)
                this.movement = true
            } else {
                this.xMap = Math.floor((currentX + this.playerCoordinate[this.direction][this.frameIndex].width) / this.game.map.level.block_size)
                this.yMap = Math.floor(currentY / this.game.map.level.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap + 1, this.yMap) && !this.game.state.isArrowDown()) return this.Up = true
                this.yMap = Math.floor((currentY + this.playerCoordinate[this.direction][this.frameIndex].height) / this.game.map.level.block_size)
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
        // Transform is now handled by the reactive effect
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
        const currentX = this.getX()
        const currentY = this.getY()
        return !this.dying && !(
            currentX + this.getPlayerWidth() <= x ||
            currentX >= x + width ||
            currentY + this.getPlayerHeight() <= y ||
            currentY >= y + height
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