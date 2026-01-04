import { dom } from '../../framework/index.js';

export class BombManager {
    constructor(game) {
        this.game = game;
        this.bombs = new Map();
    }

    createBomb(bombData) {
        const bombElement = dom({
            tag: 'div',
            attributes: {
                class: 'bomb',
                id: `bomb-${bombData.bombId}`,
                style: `position: absolute; width: ${this.game.map.blockSize}px; height: ${this.game.map.blockSize}px; left: ${bombData.gridX * this.game.map.blockSize}px; top: ${bombData.gridY * this.game.map.blockSize}px; z-index: 5; background: url('/game/assets/images/Bomb/bomb0.png') no-repeat; background-size: contain;`
            },
            children: []
        });

        document.getElementById('grid').appendChild(bombElement);

        const bomb = {
            ...bombData,
            element: bombElement,
        };

        this.bombs.set(bombData.bombId, bomb);
        return bomb;
    }

    handleExplosion(explosionData) {
        // Remove bomb element
        const bomb = this.bombs.get(explosionData.bombId);
        if (bomb && bomb.element) {
            bomb.element.remove();
            this.bombs.delete(explosionData.bombId);
        }

        // Create explosion effects
        if (explosionData.explosions) {
            explosionData.explosions.forEach(explosion => {
                this.createExplosionEffect(explosion);
            });
        }

        // Remove destroyed blocks
        if (explosionData.destroyedBlocks) {
            explosionData.destroyedBlocks.forEach(block => {
                this.removeBlock(block);
            });
        }
    }

    createExplosionEffect(explosion) {
        const explosionElement = dom({
            tag: 'div',
            attributes: {
                class: 'explosion-effect',
                style: `position: absolute; width: ${this.game.map.blockSize}px; height: ${this.game.map.blockSize}px; left: ${explosion.gridX * this.game.map.blockSize}px; top: ${explosion.gridY * this.game.map.blockSize}px; z-index: 15; background: url('/game/assets/images/explosion/explosion_1/e1_0.png') no-repeat; background-size: contain;`
            },
            children: []
        });

        document.getElementById('grid').appendChild(explosionElement);

        // Remove after animation
        setTimeout(() => {
            explosionElement.remove();
        }, 500);
    }

    removeBlock(block) {
        const blockElement = document.querySelector(`[data-grid-x="${block.gridX}"][data-grid-y="${block.gridY}"]`);
        if (blockElement) {
            blockElement.remove();
        }
    }

    cleanup() {
        this.bombs.forEach(bomb => {
            if (bomb.element && bomb.element.parentNode) {
                bomb.element.remove();
            }
        });
        this.bombs.clear();
    }
}
