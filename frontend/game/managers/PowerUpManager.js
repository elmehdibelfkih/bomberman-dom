import { dom } from '../../framework/index.js';

export class PowerUpManager {
    constructor(game) {
        this.game = game;
        this.powerUps = new Map();
    }

    spawnPowerUp(powerUpData) {
        const powerUpElement = dom({
            tag: 'div',
            attributes: {
                class: 'power-up',
                id: `powerup-${powerUpData.powerUpId}`,
                style: `position: absolute; width: ${this.game.map.blockSize}px; height: ${this.game.map.blockSize}px; left: ${powerUpData.gridX * this.game.map.blockSize}px; top: ${powerUpData.gridY * this.game.map.blockSize}px; z-index: 6; background: url('/game/assets/images/loot/${powerUpData.type}.png') no-repeat; background-size: contain;`
            },
            children: []
        });

        document.getElementById('grid').appendChild(powerUpElement);

        const powerUp = {
            ...powerUpData,
            element: powerUpElement,
        };

        this.powerUps.set(powerUpData.powerUpId, powerUp);
        return powerUp;
    }

    removePowerUp(powerUpId) {
        const powerUp = this.powerUps.get(powerUpId);
        if (powerUp && powerUp.element) {
            powerUp.element.remove();
            this.powerUps.delete(powerUpId);
        }
    }

    cleanup() {
        this.powerUps.forEach(powerUp => {
            if (powerUp.element && powerUp.element.parentNode) {
                powerUp.element.remove();
            }
        });
        this.powerUps.clear();
    }
}
