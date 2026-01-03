import { Entity } from "./Entity.js";

export class Explosion extends Entity {
    constructor(gridX, gridY, direction) {
        super('EXPLOSION')

        this.gridX = gridX;
        this.gridY = gridY;
        this.direction = direction;
        this.createdAt = Date.now();
    }

    serialize(){}
}