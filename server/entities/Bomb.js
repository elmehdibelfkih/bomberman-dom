import { Entity } from "./Entity.js";
import { GAME_CONFIG } from "../../shared/game-config.js";

export class Bomb extends Entity {
    constructor(x, y, owner, range) {
        super('BOMB')

        this.x = x
        this.y = y
        this.owner = owner;
        this.range = range;
        this.placedTime = Date.now();
        this.timerId = null;
    }

    startTimer(callback) {
        this.timerId = setTimeout(callback, GAME_CONFIG.BOMB_TIMER)
    }

    cancelTimer() {
        clearTimeout(this.timerId)
    }

    serialize() {
    }
}