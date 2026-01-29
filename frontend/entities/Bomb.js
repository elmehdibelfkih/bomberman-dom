import { Entity } from './Entity.js';

export class Bomb extends Entity {
    constructor(bombId, playerId, gridX, gridY, range, timer) {
        super(bombId, 'bomb');
        this.bombId = bombId;
        this.playerId = playerId;
        this.gridX = gridX;
        this.gridY = gridY;
        this.range = range;
        this.timer = timer;
        this.exploded = false;
    }

    explode() {
        this.exploded = true;
        this.alive = false;
    }

    serialize() {
        return {
            ...super.serialize(),
            bombId: this.bombId,
            playerId: this.playerId,
            gridX: this.gridX,
            gridY: this.gridY,
            range: this.range,
            timer: this.timer,
            exploded: this.exploded
        };
    }
}
