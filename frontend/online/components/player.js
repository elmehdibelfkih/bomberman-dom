import { dom, eventManager } from '../../framework/framework/index.js';


export class Player {

    constructor(game, playerData, isLocal = false) {
        console.log("is local", isLocal);
        
        this.game = game;
        this.is_local = isLocal;
        this.state = {
            ARROW_UP: false,
            ARROW_DOWN: false,
            ARROW_RIGHT: false,
            ARROW_LEFT: false,

            id: playerData.playerId,
            nickname: playerData.nickname,
            x: playerData.x,
            y: playerData.y,
            direction: 'Down',
            speed: playerData.speed,
            movement: false,
            dying: !playerData.alive,
            isDead: !playerData.alive,
            bombCount: playerData.bombCount,
            maxBombs: playerData.bombCount, // Assuming bombCount from data is maxBombs
            bombRange: playerData.bombRange
        };
        // Initialize instance properties x and y directly from playerData
        this.x = playerData.x;
        this.y = playerData.y;
    }

    async initPlayer() {
        this.playerCoordinate = await fetch(`../assets/playerCoordinate.json`).then(res => res.json())
        if (this.player) this.game.grid.removeChild(this.player)
        this.dyingSound = new Audio(this.game.map.mapData.dying_sound);
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

        this.player.style.backgroundImage = `url(${this.game.map.mapData.player})`;
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
            this.explosionImg = this.game.map.mapData.player_explosion_img
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
            if (this.state.bombCount < this.state.maxBombs) {
                this.game.map.addBomb(this, this.x + (this.getPlayerWidth() / 2), this.y + (this.getPlayerHeight() / 2), timestamp);
                this.putBomb = false;
                this.canPutBomb = false;
                this.incrementBombCount();
            }
        }

        if (!this.state.movement && this.state.direction.includes("walking")) {
            this.state.direction = this.state.direction.replace("walking", '')
            this.animate = true
            this.frameIndex = 0
            this.frame = this.playerCoordinate[this.state.direction][this.frameIndex];
            return
        }

        const delta = timestamp - this.lastTime;
        if ((delta >= this.MS_PER_FRAME) && this.state.movement) {
            this.frame = this.playerCoordinate[this.state.direction][this.frameIndex];
            this.lastTime = timestamp;
            this.animate = true
            this.frameIndex = (this.frameIndex + 1) % this.playerCoordinate[this.state.direction].length;
        }
    }

    async up() {
        if (this.state.ARROW_UP || this.Up) {
            this.Up = false
            if (this.game.map.canPlayerMoveTo(this, this.x, this.y - this.game.state.getPlayerSpeed())) {
                this.state.direction = 'walkingUp'
                if (!this.game.map.canPlayerMoveTo(this, this.x, this.y) || !this.game.map.canPlayerMoveTo(this, this.x, this.y - this.game.state.getPlayerSpeed())) this.x -= 7
                this.y -= this.game.state.getPlayerSpeed()
                this.state.movement = true
            } else {
                this.xMap = Math.floor((this.x - 10) / this.game.map.mapData.block_size)
                this.yMap = Math.floor(this.y / this.game.map.mapData.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap, this.yMap - 1) && !this.state.ARROW_RIGHT) return this.Left = true
                this.xMap = Math.floor((this.x + this.playerCoordinate[this.state.direction][this.frameIndex].width + 10) / this.game.map.mapData.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap, this.yMap - 1) && !this.state.ARROW_LEFT) return this.Right = true
            }
        }
    }

    async down() {
        if (this.state.ARROW_DOWN || this.Down) {
            this.Down = false
            if (this.game.map.canPlayerMoveTo(this, this.x, this.y + this.game.state.getPlayerSpeed())) {
                this.state.direction = 'walkingDown'
                if (!this.game.map.canPlayerMoveTo(this, this.x, this.y) || !this.game.map.canPlayerMoveTo(this, this.x, this.y + this.game.state.getPlayerSpeed())) this.x -= 7
                this.y += this.game.state.getPlayerSpeed()
                this.state.movement = true
            } else {
                this.xMap = Math.floor((this.x - 10) / this.game.map.mapData.block_size)
                this.yMap = Math.floor((this.y + this.playerCoordinate[this.state.direction][this.frameIndex].height) / this.game.map.mapData.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap, this.yMap + 1) && !this.state.ARROW_RIGHT) return this.Left = true
                this.xMap = Math.floor((this.x + this.playerCoordinate[this.state.direction][this.frameIndex].width + 10) / this.game.map.mapData.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap, this.yMap + 1) && !this.state.ARROW_LEFT) return this.Right = true
            }
        }
    }

    async left() {
        if (this.state.ARROW_LEFT || this.Left) {
            this.Left = false
            if (this.game.map.canPlayerMoveTo(this, this.x - this.game.state.getPlayerSpeed(), this.y)) {
                this.state.direction = 'walkingLeft'
                this.x -= this.game.state.getPlayerSpeed()
                this.state.movement = true
            } else {
                this.xMap = Math.floor((this.x) / this.game.map.mapData.block_size)
                this.yMap = Math.floor((this.y) / this.game.map.mapData.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap - 1, this.yMap) && !this.state.ARROW_DOWN) return this.Up = true
                this.yMap = Math.floor((this.y + this.playerCoordinate[this.state.direction][this.frameIndex].height) / this.game.map.mapData.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap - 1, this.yMap) && !this.state.ARROW_UP) return this.Down = true
            }
        }
    }

    async right() {
        console.log(" 1");

        if (this.state.ARROW_RIGHT || this.Right) {
            console.log(" 2");

            this.Right = false
            console.log(">>", this.game.map.canPlayerMoveTo(this, this.x + this.game.state.getPlayerSpeed(), this.y));

            if (this.game.map.canPlayerMoveTo(this, this.x + this.game.state.getPlayerSpeed(), this.y)) {
                console.log(" 3");

                this.state.direction = 'walkingRight'
                this.x += this.game.state.getPlayerSpeed()
                this.state.movement = true
            } else {
                console.log(" 4");

                this.xMap = Math.floor((this.x + this.playerCoordinate[this.state.direction][this.frameIndex].width) / this.game.map.mapData.block_size)
                this.yMap = Math.floor((this.y) / this.game.map.mapData.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap + 1, this.yMap) && !this.state.ARROW_DOWN) return this.Up = true
                this.yMap = Math.floor((this.y + this.playerCoordinate[this.state.direction][this.frameIndex].height) / this.game.map.mapData.block_size)
                if (this.game.map.isFreeSpaceInGrid(this.xMap + 1, this.yMap) && !this.state.ARROW_UP) return this.Down = true
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
        if (!this.state.movement && !this.animate) return
        this.player.style.transform = `translate(${this.x}px, ${this.y}px)`;

        if (this.animate) {
            const fx = parseFloat(this.frame.x);
            const fy = parseFloat(this.frame.y);
            this.player.style.width = `${this.frame.width}px`;
            this.player.style.height = `${this.frame.height}px`;
            this.player.style.backgroundPosition = `${fx}px ${fy}px`;
            this.animate = false;
        }
        this.state.movement = false
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
            const blockSize = this.game.map.mapData.block_size;
            if (this.isColliding(loot.x, loot.y, blockSize, blockSize)) {
                loot.removeitfromDOM()
                loot.removeitfromgrid()
                loot.makeAction()
                this.game.map.loot = this.game.map.loot.filter(b => b !== loot);
            }
        }
    }


    kill = () => this.dying = true
    getPlayerHeight = () => {
        return this.playerCoordinate[this.state.direction][this.frameIndex].height
    }
    getPlayerWidth = () => this.playerCoordinate[this.state.direction][this.frameIndex].width
    removeplayer = () => this.player.remove()

    incrementBombCount = () => { this.state.bombCount++; }
    decrementBombCount = () => { this.state.bombCount--; }

    setArrowStateKeyDown = (event) => {
        if (event.key === 'ArrowUp') this.state.ARROW_UP = true
        if (event.key === 'ArrowDown') this.state.ARROW_DOWN = true
        if (event.key === 'ArrowRight') this.state.ARROW_RIGHT = true
        if (event.key === 'ArrowLeft') this.state.ARROW_LEFT = true
    }

    setArrowStateKeyUp = (event) => {
        if (event.key === 'ArrowUp') this.state.ARROW_UP = false
        if (event.key === 'ArrowDown') this.state.ARROW_DOWN = false
        if (event.key === 'ArrowRight') this.state.ARROW_RIGHT = false
        if (event.key === 'ArrowLeft') this.state.ARROW_LEFT = false
    }
}