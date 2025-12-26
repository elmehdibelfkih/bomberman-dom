import { Entity } from "./Entity";

export class Player extends Entity {
    constructor(playerId, nickname, x, y) {
        super('PLAYER')
        this.playerId = playerId
        this.nickanme = nickname
        this.x = x;
        this.y = y;
        this.direction = 'DOWN';
        this.lives = 3;
        this.score = 0;
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
