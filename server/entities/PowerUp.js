export class PowerUp extends Entity {
    constructor(x, y, type) {
        super('POWERUP');

        this.x = x;
        this.y = y;
        this.type = type;
        this.spawnedAt = Date.now();
    }

    serialize() { }
} 