import { Entity } from './Entity.js';

export class PowerUp extends Entity {
    constructor(powerupId, type, gridX, gridY) {
        super(powerupId, 'powerup');
        this.powerupId = powerupId;
        this.powerupType = type;
        this.gridX = gridX;
        this.gridY = gridY;
        this.collected = false;
    }

    collect() {
        this.collected = true;
        this.alive = false;
    }

    serialize() {
        return {
            ...super.serialize(),
            powerupId: this.powerupId,
            powerupType: this.powerupType,
            gridX: this.gridX,
            gridY: this.gridY,
            collected: this.collected
        };
    }
}
