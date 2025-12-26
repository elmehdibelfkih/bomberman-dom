class Block extends Entity {
    constructor(x, y) {
        super('BLOCK');

        this.x = x;
        this.y = y;
        this.destructible = true;
    }

    destroy() {
        this.kill();
    }

    serialize() { }
}