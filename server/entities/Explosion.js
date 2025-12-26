export class Explosion extends Entity {
    constructor(x, y, direction) {
        super('EXPLOSION')

        this.gridX = gridX;
        this.gridY = gridY;
        this.direction = direction;
        this.createdAt = Date.now();
    }

    serialize(){}
}