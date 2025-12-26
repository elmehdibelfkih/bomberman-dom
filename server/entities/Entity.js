import { IdGenerator } from "../utils/IdGenerator";

export class Entity {
    constructor(type) {
        this.id = IdGenerator.generateEntityId()
        this.type = type
        this.alive = true;
    }

    Kill() {
        this.isAlive = false
    }

    isAlive() {
        return this.alive
    }

    isDead() {
        return !this.alive
    }

    serialize() { }
}