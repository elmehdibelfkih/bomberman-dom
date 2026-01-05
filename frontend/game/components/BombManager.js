import { dom } from '../../framework/index.js';
import * as consts from '../utils/consts.js';

export class BombManager {
    constructor(game) {
        this.game = game;
        this.bombs = new Map();
        this.bombAnimationTimers = new Map();
    }

    createBomb(bombData) {
        const bombElement = dom({
            tag: 'div',
            attributes: {
                class: 'bomb',
                id: `bomb-${bombData.bombId}`,
                style: `position: absolute; width: ${this.game.map.blockSize}px; height: ${this.game.map.blockSize}px; left: ${bombData.gridX * this.game.map.blockSize}px; top: ${bombData.gridY * this.game.map.blockSize}px; z-index: 5; background: url('/game/assets/images/Bomb/bomb0.png') no-repeat center center; background-size: contain;`
            },
            children: []
        });

        document.getElementById('grid').appendChild(bombElement);

        const bomb = {
            ...bombData,
            element: bombElement,
        };

        this.bombs.set(bombData.bombId, bomb);
        if (this.game.remoteBombs) {
            this.game.remoteBombs.set(bombData.bombId, {
                bombId: bombData.bombId,
                gridX: bombData.gridX,
                gridY: bombData.gridY,
                playerId: bombData.playerId,
                range: bombData.range
            });
        }

        this.startBombAnimation(bombData.bombId, bombElement);
        return bomb;
    }

    handleExplosion(explosionData) {
        // Remove bomb element
        const bomb = this.bombs.get(explosionData.bombId);
        if (bomb && bomb.element) {
            bomb.element.remove();
            this.bombs.delete(explosionData.bombId);
        }
        if (this.game.remoteBombs) {
            this.game.remoteBombs.delete(explosionData.bombId);
        }
        this.stopBombAnimation(explosionData.bombId);

        // Create explosion effects
        if (explosionData.explosions) {
            explosionData.explosions.forEach(explosion => {
                this.createExplosionEffect(explosion);
            });
        }

        // Remove destroyed blocks and update grid
        if (explosionData.destroyedBlocks) {
            explosionData.destroyedBlocks.forEach(block => {
                this.removeBlock(block);
            });
        }
    }

    createExplosionEffect(explosion) {
        const frames = [0, 1, 2, 3, 4].map(i => `/game/assets/images/explosion/explosion_1/e1_${i}.png`);
        let frameIndex = 0;

        const explosionElement = dom({
            tag: 'div',
            attributes: {
                class: 'explosion-effect',
                style: `position: absolute; width: ${this.game.map.blockSize}px; height: ${this.game.map.blockSize}px; left: ${explosion.gridX * this.game.map.blockSize}px; top: ${explosion.gridY * this.game.map.blockSize}px; z-index: 15; background: url('${frames[0]}') no-repeat center center; background-size: contain;`
            },
            children: []
        });

        document.getElementById('grid').appendChild(explosionElement);

        const interval = setInterval(() => {
            frameIndex = (frameIndex + 1) % frames.length;
            explosionElement.style.backgroundImage = `url('${frames[frameIndex]}')`;
        }, 70);

        setTimeout(() => {
            clearInterval(interval);
            explosionElement.remove();
        }, 450);
    }

    removeBlock(block) {
        // Update logical grid
        if (this.game?.map?.gridArray && this.game.map.gridArray[block.gridY]) {
            this.game.map.gridArray[block.gridY][block.gridX] = consts.FLOOR;
        }

        // Remove DOM tile image (soft block) if present
        const blockElement = document.querySelector(`[data-row-index="${block.gridX}"][data-col-index="${block.gridY}"] img`);
        if (blockElement && blockElement.parentNode) {
            this.createBlockDestroyEffect(block.gridX, block.gridY);
            blockElement.parentNode.removeChild(blockElement);
        }
    }

    createBlockDestroyEffect(gridX, gridY) {
        const tileSize = this.game.map.blockSize;
        const effect = dom({
            tag: 'div',
            attributes: {
                class: 'block-destroy-effect',
                style: `position: absolute; width: ${tileSize}px; height: ${tileSize}px; left: ${gridX * tileSize}px; top: ${gridY * tileSize}px; z-index: 12; background: url('/game/assets/images/explosion/explosion_2/Explosion_1.png') no-repeat center center; background-size: contain; opacity: 1; transform: scale(1);`
            },
            children: []
        });

        const grid = document.getElementById('grid');
        if (!grid) return;
        grid.appendChild(effect);

        // Simple fade/scale-out effect
        effect.animate([
            { opacity: 1, transform: 'scale(1)' },
            { opacity: 0, transform: 'scale(1.3)' }
        ], {
            duration: 250,
            easing: 'ease-out',
            fill: 'forwards'
        });

        setTimeout(() => effect.remove(), 260);
    }

    startBombAnimation(bombId, element) {
        // Simple looping frames for ticking bomb
        const frames = [0, 1, 2, 1];
        let idx = 0;
        const timer = setInterval(() => {
            idx = (idx + 1) % frames.length;
            element.style.backgroundImage = `url('/game/assets/images/Bomb/bomb${frames[idx]}.png')`;
        }, 120);
        this.bombAnimationTimers.set(bombId, timer);
    }

    stopBombAnimation(bombId) {
        const timer = this.bombAnimationTimers.get(bombId);
        if (timer) {
            clearInterval(timer);
            this.bombAnimationTimers.delete(bombId);
        }
    }

    cleanup() {
        this.bombAnimationTimers.forEach(timer => clearInterval(timer));
        this.bombAnimationTimers.clear();
        this.bombs.forEach(bomb => {
            if (bomb.element && bomb.element.parentNode) {
                bomb.element.remove();
            }
        });
        this.bombs.clear();
    }
}
