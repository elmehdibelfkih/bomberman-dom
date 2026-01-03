import { IdGenerator } from "../utils/IdGenerator.js";

export class Entity {
    constructor(type) {
        this.id = IdGenerator.generateEntityId()
        this.type = type
        this.alive = true;
    }

    kill() {
        this.alive = false
    }

    isAlive() {
        return this.alive
    }

    isDead() {
        return !this.alive
    }

    serialize() { }
}