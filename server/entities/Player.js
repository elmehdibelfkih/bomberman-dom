import { Entity } from "./Entity.js";

export class Player extends Entity {
    constructor(playerId, nickname, x, y) {
        super('PLAYER')
        this.playerId = playerId
        this.nickname = nickname
        this.x = x;
        this.y = y;
        this.direction = 'DOWN';
        this.lives = 3;
        this.maxBombs = 1;
        this.activeBombs = 0;
        this.bombRange = 1;
        this.speed = 1;
        this.powerups = [];
    }

    takeDamage() {

    }

    canPlaceBomb() {

    }

    incrementActiveBombs() { }
    decrementActiveBombs() { }
    addPowerUp(type) { }
    serialize() { }
}
