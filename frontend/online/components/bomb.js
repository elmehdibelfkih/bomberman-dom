import * as consts from '../utils/consts.js';
import { dom } from '../../framework/framework/index.js';

export class Bomb {
    constructor(game, player, x, y, timestamp) {
        this.game = game
        this.player = player
        this.id = player.state.id + '_bomb_' + Date.now();
        this.done = false
        this.xMap = Math.floor(x / this.game.map.level.block_size)
        this.yMap = Math.floor(y / this.game.map.level.block_size)
        this.startTime = timestamp
        this.flashing = true
        this.image = this.game.map.level.bomb
        this.explosionTime = this.game.map.level.explosion_time
        this.explosionImg = this.game.map.level.electric_shock_img
        this.frameIndex = 0
        this.lastTime = performance.now()
        this.freeBlocks = []
        this.x = x
        this.y = y
        this.active = true
        this.initBomb()
    }


    getId = () => this.id
    isDone = () => this.done

    initBomb() {
        const size = this.game.map.level.block_size;
        this.img = dom({
            tag: 'img',
            attributes: {
                src: this.image
            }
        });
        this.bomb = dom({
            tag: 'div',
            attributes: {
                id: `bomb${this.id}`,
                style: `
                    opacity: 1;
                    position: absolute;
                    width: ${size}px;
                    height: ${size}px;
                    transform: translate(${this.xMap * size}px, ${this.yMap * size}px);
                `
            }
        });
        this.bomb.appendChild(this.img);

        this.game.map.grid.appendChild(this.bomb);
        this.game.map.gridArray[this.yMap][this.xMap] = consts.BOMB;
        this.game.map.gridArray[this.yMap][this.xMap - 1] !== consts.WALL ? this.freeBlocks.push(1) : 0;
        this.game.map.gridArray[this.yMap][this.xMap + 1] !== consts.WALL ? this.freeBlocks.push(3) : 0;
        this.game.map.gridArray[this.yMap - 1][this.xMap] !== consts.WALL ? this.freeBlocks.push(2) : 0;
        this.game.map.gridArray[this.yMap + 1][this.xMap] !== consts.WALL ? this.freeBlocks.push(0) : 0;
        this.electricShock = new Audio(this.game.map.level.shock_sound);
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

        if (timestamp - this.startTime >= this.explosionTime + 1000) {
            if (delta >= 50) {
                this.disappearing = true
                this.lastTime = timestamp;
            }
            this.game.map.gridArray[this.yMap][this.xMap] = 0
            this.active = false
            this.render()
            return
        }
        if (timestamp - this.startTime >= this.explosionTime) {
            if (!this.kill) {
                const tmp = this.game.map.level.block_size
                const bombX = this.xMap * tmp
                const bombY = this.yMap * tmp

                for (const player of this.game.players.values()) {
                    // Check collision with the center of the bomb
                    if (player.isColliding(bombX, bombY, tmp, tmp)) {
                        player.kill();
                    }
                    // Check collision with the explosion arms (up, down, left, right)
                    if (player.isColliding(bombX, bombY - tmp, tmp, tmp)) { // Up
                        player.kill();
                    }
                    if (player.isColliding(bombX, bombY + tmp, tmp, tmp)) { // Down
                        player.kill();
                    }
                    if (player.isColliding(bombX - tmp, bombY, tmp, tmp)) { // Left
                        player.kill();
                    }
                    if (player.isColliding(bombX + tmp, bombY, tmp, tmp)) { // Right
                        player.kill();
                    }
                }
                this.kill = true; // Mark that explosion has processed player kills
            }
            if (!this.blowingUpBlock) {
                this.game.map.isBlock(this.xMap - 1, this.yMap) ? (this.game.map.blowingUpBlock(this.xMap - 1, this.yMap), this.blowingUpBlock = true) : 0
                this.game.map.isBlock(this.xMap + 1, this.yMap) ? (this.game.map.blowingUpBlock(this.xMap + 1, this.yMap), this.blowingUpBlock = true) : 0
                this.game.map.isBlock(this.xMap, this.yMap - 1) ? (this.game.map.blowingUpBlock(this.xMap, this.yMap - 1), this.blowingUpBlock = true) : 0
                this.game.map.isBlock(this.xMap, this.yMap + 1) ? (this.game.map.blowingUpBlock(this.xMap, this.yMap + 1), this.blowingUpBlock = true) : 0
                this.blowingUpBlock = true
            }
            this.image = this.image.replace(/\d+\.png$/, "2.png");
            this.flashing = true
            if (delta >= 20) {
                this.frameIndex = (this.frameIndex + 1) % 4;
                this.explosionImg = this.explosionImg.replace(this.frameIndex + ".png", ((this.frameIndex + 1) % 4) + ".png")
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
            this.exp = []
            for (let i = 0; i < 4; i++) {
                if (!this.freeBlocks.includes(i)) continue
                const expImg = dom({
                    tag: 'img',
                    attributes: {
                        style: `
                            position: absolute;
                            transform: ${i === 0 ? 'translate(-68px, 34px)' : i === 1 ? 'rotate(90deg) translate(-17px, 119px)' : i === 2 ? 'rotate(180deg) translate(68px, 68px)' : 'rotate(270deg) translate(17px, -17px)'};
                        `
                    }
                })
                this.exp[i] = expImg;
                this.bomb.appendChild(expImg)
            }
        }
        this.exp?.forEach(b => b ? b.src = this.explosionImg : 0);
    }

    async makeDisappearing() {
        this.bomb.style.opacity = parseFloat(this.bomb.style.opacity) - 0.1;
        if (this.bomb.style.opacity <= 0) {
            this.game.map.grid.removeChild(this.bomb);
            this.player.decrementBombCount();
            this.done = true;
        }
    }
    cleanDOM() {
        this.done = true;
        this.active = false;
        if (this.bomb && this.bomb.parentNode) this.bomb.parentNode.removeChild(this.bomb);
        this.player.decrementBombCount();
        this.bomb = null;
        this.img = null;
        this.exp = null;
    }
}



