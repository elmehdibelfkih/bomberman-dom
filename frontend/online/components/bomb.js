import * as consts from '../utils/consts.js';
import { createBombElement, createExplosionElement } from '../utils/helpers.js';

export class Bomb {
    constructor(game, player, xMap, yMap, range = player.getBombRange()) {
        this.game = game
        this.range = range
        this.player = player
        this.id = player.state.id + '_bomb_' + Date.now();
        this.done = false
        this.xMap = xMap
        this.yMap = yMap
        this.startTime = performance.now()
        this.flashing = true
        this.image = this.game.map.mapData.bomb
        this.explosionTime = this.game.map.mapData.explosion_time
        this.explosionImg = this.game.map.mapData.electric_shock_img
        this.explosionImg2 = this.game.map.mapData.electric_shock2_img
        this.frameIndex = 0
        this.lastTime = performance.now()
        this.freeBlocks = []
        this.active = true
        this.initBomb()
    }

    initBomb() {
        const size = this.game.map.mapData.block_size;
        const { bomb, img } = createBombElement(this.id, this.xMap, this.yMap, size, this.image);
        this.bomb = bomb;
        this.img = img;

        this.game.map.grid.appendChild(this.bomb);
        this.game.map.gridArray[this.yMap][this.xMap] = consts.BOMB;
        this.game.map.gridArray[this.yMap][this.xMap - 1] !== consts.WALL ? this.freeBlocks.push('LEFT') : 0;
        this.game.map.gridArray[this.yMap][this.xMap + 1] !== consts.WALL ? this.freeBlocks.push('RIGHT') : 0;
        this.game.map.gridArray[this.yMap - 1][this.xMap] !== consts.WALL ? this.freeBlocks.push('UP') : 0;
        this.game.map.gridArray[this.yMap + 1][this.xMap] !== consts.WALL ? this.freeBlocks.push('DOWN') : 0;

        // check the second 

        if (this.range == 2) {
            this.game.map.gridArray[this.yMap]?.[this.xMap - 2] !== consts.WALL && this.game.map.gridArray[this.yMap]?.[this.xMap - 2] != undefined ? this.LEFT = true : 0;
            this.game.map.gridArray[this.yMap]?.[this.xMap + 2] !== consts.WALL && this.game.map.gridArray[this.yMap]?.[this.xMap + 2] != undefined ? this.RIGHT = true : 0;
            this.game.map.gridArray[this.yMap - 2]?.[this.xMap] !== consts.WALL && this.game.map.gridArray[this.yMap - 2]?.[this.xMap] != undefined ? this.UP = true : 0;
            this.game.map.gridArray[this.yMap + 2]?.[this.xMap] !== consts.WALL && this.game.map.gridArray[this.yMap + 2]?.[this.xMap] != undefined ? this.DOWN = true : 0;
        }

        this.electricShock = new Audio(this.game.map.mapData.shock_sound);
    }

    async render() {
        if (this.done) return
        if (this.flashing) {
            this.img.src = this.image
            this.flashing = false
        }
        if (this.explosion) {
            this.makeShockSound()
            this.makeExplosion()
            this.explosion = false
        }
        if (this.disappearing) {
            this.makeDisappearing()
            this.disappearing = false
        }
    }

    async updateRender(timestamp) {
        if (this.done) {
            this.render()
            return true
        }
        const delta = timestamp - this.lastTime;

        // disappearing time
        if (timestamp - this.startTime >= this.explosionTime * 2 + 1000) {
            if (delta >= 50) {
                this.disappearing = true
                this.lastTime = timestamp;
            }
            this.game.map.gridArray[this.yMap][this.xMap] = 0
            this.active = false
            this.render()
            return
        }

        // explosion time
        if (timestamp - this.startTime >= this.explosionTime) { // check for when to explode
            if (!this.blowingUpBlock) {
                this.game.map.isBlock(this.xMap - 1, this.yMap) ? this.game.map.blowingUpBlock(this.xMap - 1, this.yMap, false) : 0
                this.game.map.isBlock(this.xMap + 1, this.yMap) ? this.game.map.blowingUpBlock(this.xMap + 1, this.yMap, false) : 0
                this.game.map.isBlock(this.xMap, this.yMap - 1) ? this.game.map.blowingUpBlock(this.xMap, this.yMap - 1, false) : 0
                this.game.map.isBlock(this.xMap, this.yMap + 1) ? this.game.map.blowingUpBlock(this.xMap, this.yMap + 1, false) : 0
                if (this.range == 2 && (this.LEFT || this.RIGHT || this.UP || this.DOWN)) {
                    if (this.LEFT && !this.game.map.isWall(this.xMap - 1, this.yMap)) {
                        this.game.map.isBlock(this.xMap - 2, this.yMap) ? this.game.map.blowingUpBlock(this.xMap - 2, this.yMap, true) : 0
                    }
                    if (this.RIGHT && !this.game.map.isWall(this.xMap + 1, this.yMap)) {
                        this.game.map.isBlock(this.xMap + 2, this.yMap) ? this.game.map.blowingUpBlock(this.xMap + 2, this.yMap, true) : 0
                    }
                    if (this.UP && !this.game.map.isWall(this.xMap, this.yMap - 1)) {
                        this.game.map.isBlock(this.xMap, this.yMap - 2) ? this.game.map.blowingUpBlock(this.xMap, this.yMap - 2, true) : 0
                    }
                    if (this.DOWN && !this.game.map.isWall(this.xMap, this.yMap + 1)) {
                        this.game.map.isBlock(this.xMap, this.yMap + 2) ? this.game.map.blowingUpBlock(this.xMap, this.yMap + 2, true) : 0
                    }
                }
                this.blowingUpBlock = true
            }
            this.image = this.image.replace(/\d+\.png$/, "2.png");
            this.flashing = true
            if (delta >= 20) {
                this.frameIndex = (this.frameIndex + 1) % 4;
                this.explosionImg = this.explosionImg.replace(this.frameIndex + ".png", ((this.frameIndex + 1) % 4) + ".png")
                if (this.range == 2) this.explosionImg2 = this.explosionImg2.replace(this.frameIndex + ".png", ((this.frameIndex + 1) % 4) + ".png")
                this.lastTime = timestamp;
            }
            this.explosion = true
            this.render()
            return
        }
        if (delta >= 300) {
            this.frameIndex = (this.frameIndex + 1) % 2;
            this.image = this.image.replace(this.frameIndex + ".png", ((this.frameIndex + 1) % 2) + ".png")
            this.flashing = true
            this.lastTime = timestamp;
        }
        this.render()
    }


    async makeShockSound() {
        if (!this.shock) {
            this.electricShock.play().catch(err => {
                console.error("Playback failed:", err);
            });
            this.shock = true
        }
    }

    async makeExplosion() {
        if (!this.exp) {
            this.exp = new Map();
            for (const direction of this.freeBlocks) {
                const isExtended = (direction === 'DOWN' && this.DOWN) || (direction === 'UP' && this.UP) || (direction === 'LEFT' && this.LEFT) || (direction === 'RIGHT' && this.RIGHT);
                const expImg = createExplosionElement(direction, isExtended);
                this.exp.set(direction, expImg);
                this.bomb.appendChild(expImg);
            }
        }
        this.exp?.forEach((b, key) => {
            if (b) {
                if ((key === 'DOWN' && this.DOWN) || (key === 'UP' && this.UP) || (key === 'LEFT' && this.LEFT) || (key === 'RIGHT' && this.RIGHT)) b.src = this.explosionImg2;
                else b.src = this.explosionImg;
            }
        });
    }

    async makeDisappearing() {
        this.bomb.style.opacity = parseFloat(this.bomb.style.opacity) - 0.1;
        if (this.bomb.style.opacity <= 0) {
            this.game.map.grid.removeChild(this.bomb);
            this.player.incrementBombCount();
            this.done = true;
        }
    }
    cleanDOM() {
        this.done = true;
        this.active = false;
        if (this.bomb && this.bomb.parentNode) this.bomb.parentNode.removeChild(this.bomb);
        this.bomb = null;
        this.img = null;
        this.exp = null;
    }
}