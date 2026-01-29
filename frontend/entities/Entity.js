export class Entity {
    constructor(id, type) {
        this.id = id;
        this.type = type;
        this.alive = true;
    }

    kill() {
        this.alive = false;
    }

    isAlive() {
        return this.alive;
    }

    serialize() {
        return {
            id: this.id,
            type: this.type,
            alive: this.alive
        };
    }
}
